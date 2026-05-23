/**
 * deletion.ts 単体テスト
 * 由来: 003_account_UNIT_TEST.md §1.2 (A01〜A05) / §1.9 (PG01〜PG03) / §1.10 (B01)
 */
import { describe, it, expect, vi } from 'vitest';
import {
  sanitizeDeletionReason,
  isPurgeEligible,
  requestAccountDeletion,
  cancelAccountDeletion,
  MAX_DELETION_REASON,
  type AccountDeletionStore,
} from './deletion';
import { AlreadyDeletedError, NotPendingDeletionError } from './errors';

const DAY = 24 * 60 * 60 * 1000;

describe('sanitizeDeletionReason', () => {
  it('UT-AC-A02/D03: 501 文字 → 500 に trim', () => {
    const r = sanitizeDeletionReason('a'.repeat(501));
    expect(r).toHaveLength(MAX_DELETION_REASON);
  });
  it('前後空白 trim、空は null', () => {
    expect(sanitizeDeletionReason('  hi  ')).toBe('hi');
    expect(sanitizeDeletionReason('   ')).toBeNull();
    expect(sanitizeDeletionReason(null)).toBeNull();
    expect(sanitizeDeletionReason(undefined)).toBeNull();
  });
});

describe('isPurgeEligible', () => {
  const deletedAt = new Date('2026-05-01T00:00:00Z');
  it('UT-AC-PG01: 31 日経過 → true', () => {
    expect(isPurgeEligible(deletedAt, new Date(deletedAt.getTime() + 31 * DAY))).toBe(true);
  });
  it('UT-AC-PG02/B01: ちょうど 30 日 → true (gte)', () => {
    expect(isPurgeEligible(deletedAt, new Date(deletedAt.getTime() + 30 * DAY))).toBe(true);
  });
  it('UT-AC-PG03: 29 日 → false', () => {
    expect(isPurgeEligible(deletedAt, new Date(deletedAt.getTime() + 29 * DAY))).toBe(false);
  });
  it('deleted_at=null → false', () => {
    expect(isPurgeEligible(null, new Date())).toBe(false);
  });
});

function makeStore(initial: Date | null) {
  let deletedAt = initial;
  const setDeletedAt = vi.fn((_u: string, at: Date | null) => {
    deletedAt = at;
    return Promise.resolve();
  });
  const getDeletedAt = vi.fn(() => Promise.resolve(deletedAt));
  return { store: { getDeletedAt, setDeletedAt } as AccountDeletionStore, getDeletedAt, setDeletedAt };
}

describe('requestAccountDeletion', () => {
  it('UT-AC-A01: 未予約 → deleted_at set + reason 保存', async () => {
    const { store, setDeletedAt } = makeStore(null);
    const now = new Date('2026-05-23T00:00:00Z');
    await requestAccountDeletion(store, 'user_1', '  too slow  ', now);
    expect(setDeletedAt).toHaveBeenCalledWith('user_1', now, 'too slow');
  });
  it('UT-AC-A03: 既予約 → AlreadyDeletedError', async () => {
    const { store } = makeStore(new Date());
    await expect(requestAccountDeletion(store, 'user_1', null)).rejects.toThrow(AlreadyDeletedError);
  });
});

describe('cancelAccountDeletion', () => {
  it('UT-AC-A04: 予約済 → deleted_at=null', async () => {
    const { store, setDeletedAt } = makeStore(new Date());
    await cancelAccountDeletion(store, 'user_1');
    expect(setDeletedAt).toHaveBeenCalledWith('user_1', null, null);
  });
  it('UT-AC-A05: 未予約 → NotPendingDeletionError', async () => {
    const { store } = makeStore(null);
    await expect(cancelAccountDeletion(store, 'user_1')).rejects.toThrow(NotPendingDeletionError);
  });
});

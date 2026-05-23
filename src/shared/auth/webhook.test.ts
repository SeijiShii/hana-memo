/**
 * webhook.ts 単体テスト (Clerk → Neon users 同期、[SEC-006] idempotency-adjacent)
 * 由来: 001_auth_SPEC.md §1.2 / §4.2 (E-AU-006)
 */
import { describe, it, expect, vi } from 'vitest';
import {
  mapClerkWebhookEvent,
  applyUserSync,
  type UserSyncStore,
} from './webhook';

describe('mapClerkWebhookEvent', () => {
  it('user.created (email なし) → 匿名 upsert', () => {
    expect(
      mapClerkWebhookEvent({ type: 'user.created', data: { id: 'user_abc' } }),
    ).toEqual({ op: 'upsert', clerkUserId: 'user_abc', email: null, isAnonymous: true });
  });

  it('user.updated (email あり) → 非匿名 upsert + email', () => {
    expect(
      mapClerkWebhookEvent({
        type: 'user.updated',
        data: { id: 'user_abc', email_addresses: [{ email_address: 'a@b.com' }] },
      }),
    ).toEqual({ op: 'upsert', clerkUserId: 'user_abc', email: 'a@b.com', isAnonymous: false });
  });

  it('external_accounts あり → 非匿名', () => {
    const op = mapClerkWebhookEvent({
      type: 'user.updated',
      data: { id: 'user_abc', external_accounts: [{ provider: 'google' }] },
    });
    expect(op).toMatchObject({ op: 'upsert', isAnonymous: false });
  });

  it('user.deleted → softDelete', () => {
    expect(
      mapClerkWebhookEvent({ type: 'user.deleted', data: { id: 'user_abc' } }),
    ).toEqual({ op: 'softDelete', clerkUserId: 'user_abc' });
  });

  it('data.id 欠落 → ignore', () => {
    const op = mapClerkWebhookEvent({ type: 'user.created', data: { id: '' } });
    expect(op.op).toBe('ignore');
  });

  it('未対応イベント → ignore', () => {
    const op = mapClerkWebhookEvent({ type: 'session.created', data: { id: 'user_abc' } });
    expect(op).toMatchObject({ op: 'ignore' });
  });
});

describe('applyUserSync', () => {
  function makeStore() {
    const upsertUser = vi.fn(() => Promise.resolve());
    const softDeleteUser = vi.fn(() => Promise.resolve());
    return { store: { upsertUser, softDeleteUser } as UserSyncStore, upsertUser, softDeleteUser };
  }

  it('匿名 upsert → linkedAt=null', async () => {
    const { store, upsertUser } = makeStore();
    await applyUserSync(
      { op: 'upsert', clerkUserId: 'user_abc', email: null, isAnonymous: true },
      store,
    );
    expect(upsertUser).toHaveBeenCalledWith('user_abc', {
      email: null,
      isAnonymous: true,
      linkedAt: null,
    });
  });

  it('非匿名 upsert → linkedAt=now', async () => {
    const { store, upsertUser } = makeStore();
    const now = new Date('2026-05-23T00:00:00Z');
    await applyUserSync(
      { op: 'upsert', clerkUserId: 'user_abc', email: 'a@b.com', isAnonymous: false },
      store,
      now,
    );
    expect(upsertUser).toHaveBeenCalledWith('user_abc', {
      email: 'a@b.com',
      isAnonymous: false,
      linkedAt: now,
    });
  });

  it('softDelete → softDeleteUser 呼出', async () => {
    const { store, softDeleteUser } = makeStore();
    await applyUserSync({ op: 'softDelete', clerkUserId: 'user_abc' }, store);
    expect(softDeleteUser).toHaveBeenCalledWith('user_abc');
  });

  it('ignore → store を呼ばない', async () => {
    const { store, upsertUser, softDeleteUser } = makeStore();
    await applyUserSync({ op: 'ignore', reason: 'x' }, store);
    expect(upsertUser).not.toHaveBeenCalled();
    expect(softDeleteUser).not.toHaveBeenCalled();
  });
});

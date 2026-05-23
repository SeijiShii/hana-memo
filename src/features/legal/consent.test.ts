/**
 * consent.ts 単体テスト (同意レコード構築・検証・最新導出)
 * 由来: 003_legal_UNIT_TEST.md §1.1 (A01/A02/A04/A05/A06) + §1.7 (E03)
 */
import { describe, it, expect, vi } from 'vitest';
import {
  buildConsentRecords,
  validateConsentInput,
  deriveLatestConsents,
  recordConsents,
  type ConsentStore,
} from './consent';
import { ConsentError } from './errors';

describe('buildConsentRecords', () => {
  it('UT-LE-A01: 単一 → 1 レコード (user_id 付き)', () => {
    const recs = buildConsentRecords('user_1', ['privacy_policy']);
    expect(recs).toEqual([
      { userId: 'user_1', docType: 'privacy_policy', docVersion: 'v1.0.0', ipHash: null },
    ]);
  });

  it('UT-LE-A02: 3 件一括 → 3 レコード', () => {
    const recs = buildConsentRecords('user_1', ['privacy_policy', 'terms_of_service', 'ai_usage']);
    expect(recs).toHaveLength(3);
    expect(recs.map((r) => r.docType)).toEqual(['privacy_policy', 'terms_of_service', 'ai_usage']);
  });

  it('UT-LE-A06: ip_hash を透過', () => {
    const recs = buildConsentRecords('user_1', ['privacy_policy'], undefined, 'deadbeef');
    expect(recs[0]!.ipHash).toBe('deadbeef');
  });

  it('userId 空 → ConsentError', () => {
    expect(() => buildConsentRecords('', ['privacy_policy'])).toThrow(ConsentError);
  });

  it('UT-LE-E03: version null (cookie_policy) → ConsentError', () => {
    expect(() => buildConsentRecords('user_1', ['cookie_policy'])).toThrow(ConsentError);
  });
});

describe('validateConsentInput', () => {
  it('正常 → throw しない', () => {
    expect(() => validateConsentInput('privacy_policy', 'v1.0.0')).not.toThrow();
  });
  it('null version → ConsentError', () => {
    expect(() => validateConsentInput('privacy_policy', null)).toThrow(ConsentError);
  });
  it('形式不正 → ConsentError', () => {
    expect(() => validateConsentInput('privacy_policy', '1.0')).toThrow(ConsentError);
  });
});

describe('deriveLatestConsents', () => {
  it('UT-LE-A04: doc_type 別に最新を導出', () => {
    const rows = [
      { docType: 'privacy_policy', docVersion: 'v1.0.0', agreedAt: '2026-05-01T00:00:00Z' },
      { docType: 'terms_of_service', docVersion: 'v1.0.0', agreedAt: '2026-05-01T00:00:00Z' },
      { docType: 'ai_usage', docVersion: 'v1.0.0', agreedAt: '2026-05-01T00:00:00Z' },
    ];
    expect(deriveLatestConsents(rows)).toEqual({
      privacy_policy: 'v1.0.0',
      terms_of_service: 'v1.0.0',
      ai_usage: 'v1.0.0',
    });
  });

  it('同 doc_type 複数 → agreedAt 最新を採用', () => {
    const rows = [
      { docType: 'privacy_policy', docVersion: 'v1.0.0', agreedAt: '2026-05-01T00:00:00Z' },
      { docType: 'privacy_policy', docVersion: 'v1.1.0', agreedAt: '2026-05-10T00:00:00Z' },
    ];
    expect(deriveLatestConsents(rows).privacy_policy).toBe('v1.1.0');
  });

  it('UT-LE-A05: 行なし → 空 Object', () => {
    expect(deriveLatestConsents([])).toEqual({});
  });
});

describe('recordConsents', () => {
  it('store.insertConsents に委譲', async () => {
    const insertConsents = vi.fn(() => Promise.resolve());
    const store: ConsentStore = { insertConsents };
    const recs = buildConsentRecords('user_1', ['privacy_policy']);
    await recordConsents(store, recs);
    expect(insertConsents).toHaveBeenCalledWith(recs);
  });

  it('空レコード → store を呼ばない', async () => {
    const insertConsents = vi.fn(() => Promise.resolve());
    await recordConsents({ insertConsents }, []);
    expect(insertConsents).not.toHaveBeenCalled();
  });
});

/**
 * api/legal/consents.ts 単体テスト (POST body 検証 + client IP 抽出 + handler 配線)
 *
 * DB INSERT/SELECT は ConsentStore / loadLatest 注入で DB 非依存に保つ
 * (notebook/list.ts・_lib/user.ts と同方針)。core (deriveLatestConsents /
 * buildConsentRecords) は consent.test.ts で別途検証済。
 *
 * 由来: docs/legal/001_legal_SPEC.md §1 UC1/UC3/UC4 §2.1, 003_legal_UNIT_TEST.md §1.1 (A01〜A06)
 */
import { describe, it, expect } from 'vitest';
import {
  parseConsentDocTypes,
  extractClientIp,
  handleConsents,
  type ConsentsDeps,
} from './consents';
import { ConsentError } from '../../../src/features/legal/errors';
import type { ConsentRecord } from '../../../src/features/legal/consent';

describe('parseConsentDocTypes', () => {
  it('UT-LE-API01: 単一 docType を配列で返す', () => {
    expect(parseConsentDocTypes({ docTypes: ['privacy_policy'] })).toEqual(['privacy_policy']);
  });

  it('UT-LE-API02: 複数 docType を保持、重複は除去', () => {
    expect(
      parseConsentDocTypes({ docTypes: ['privacy_policy', 'terms_of_service', 'privacy_policy'] }),
    ).toEqual(['privacy_policy', 'terms_of_service']);
  });

  it('UT-LE-API03: 空配列は ConsentError', () => {
    expect(() => parseConsentDocTypes({ docTypes: [] })).toThrow(ConsentError);
  });

  it('UT-LE-API04: docTypes 欠落は ConsentError', () => {
    expect(() => parseConsentDocTypes({})).toThrow(ConsentError);
  });

  it('UT-LE-API05: 不正な docType は ConsentError', () => {
    expect(() => parseConsentDocTypes({ docTypes: ['bogus'] })).toThrow(ConsentError);
  });
});

describe('extractClientIp', () => {
  const reqWith = (headers: Record<string, string>) =>
    new Request('https://x.test/api/legal/consents', { headers });

  it('x-forwarded-for の先頭 IP を返す', () => {
    expect(extractClientIp(reqWith({ 'x-forwarded-for': '203.0.113.7, 10.0.0.1' }))).toBe(
      '203.0.113.7',
    );
  });

  it('x-real-ip にフォールバック', () => {
    expect(extractClientIp(reqWith({ 'x-real-ip': '198.51.100.9' }))).toBe('198.51.100.9');
  });

  it('ヘッダ無しは null', () => {
    expect(extractClientIp(reqWith({}))).toBeNull();
  });
});

describe('handleConsents', () => {
  const baseDeps: ConsentsDeps = {
    verifySession: async () => ({ clerkUserId: 'clerk_1' }),
    resolveUser: async () => 'user-uuid-1',
  };

  const post = (body: unknown, headers: Record<string, string> = {}) =>
    new Request('https://x.test/api/legal/consents', {
      method: 'POST',
      headers: { 'content-type': 'application/json', ...headers },
      body: JSON.stringify(body),
    });

  it('GET/POST 以外は 405', async () => {
    const res = await handleConsents(
      new Request('https://x.test/api/legal/consents', { method: 'DELETE' }),
      baseDeps,
    );
    expect(res.status).toBe(405);
  });

  it('認証失敗は 401', async () => {
    const { UnauthorizedError } = await import('../../_lib/clerk');
    const res = await handleConsents(new Request('https://x.test/api/legal/consents'), {
      verifySession: async () => {
        throw new UnauthorizedError('nope');
      },
    });
    expect(res.status).toBe(401);
  });

  it('GET: loadLatest の結果を consents で返す', async () => {
    const res = await handleConsents(new Request('https://x.test/api/legal/consents'), {
      ...baseDeps,
      loadLatest: async (userId) => {
        expect(userId).toBe('user-uuid-1');
        return { privacy_policy: 'v1.0.0', terms_of_service: 'v1.0.0' };
      },
    });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      consents: { privacy_policy: 'v1.0.0', terms_of_service: 'v1.0.0' },
    });
  });

  it('POST: store へ記録し recorded 件数を 201 で返す', async () => {
    const captured: ConsentRecord[] = [];
    const res = await handleConsents(post({ docTypes: ['privacy_policy', 'terms_of_service'] }), {
      ...baseDeps,
      store: { insertConsents: async (records) => void captured.push(...records) },
    });
    expect(res.status).toBe(201);
    expect(await res.json()).toEqual({ ok: true, recorded: 2 });
    expect(captured.map((r) => r.docType)).toEqual(['privacy_policy', 'terms_of_service']);
    expect(captured.every((r) => r.userId === 'user-uuid-1')).toBe(true);
    expect(captured.every((r) => r.ipHash === null)).toBe(true); // salt/ip 無し
  });

  it('POST: ipSalt + x-forwarded-for があれば ip_hash を計算して記録', async () => {
    const captured: ConsentRecord[] = [];
    const res = await handleConsents(
      post({ docTypes: ['privacy_policy'] }, { 'x-forwarded-for': '203.0.113.7' }),
      {
        ...baseDeps,
        ipSalt: 'test-salt',
        store: { insertConsents: async (records) => void captured.push(...records) },
      },
    );
    expect(res.status).toBe(201);
    expect(captured[0]?.ipHash).toMatch(/^[0-9a-f]{64}$/); // sha256 hex
  });

  it('POST: 不正 body は 400', async () => {
    const res = await handleConsents(post({ docTypes: [] }), {
      ...baseDeps,
      store: { insertConsents: async () => {} },
    });
    expect(res.status).toBe(400);
  });

  it('POST: cookie_policy (未提供版) は 400 (LATEST_VERSIONS=null)', async () => {
    const res = await handleConsents(post({ docTypes: ['cookie_policy'] }), {
      ...baseDeps,
      store: { insertConsents: async () => {} },
    });
    expect(res.status).toBe(400);
  });

  it('Neon user 不在は 404', async () => {
    const { UserNotFoundError } = await import('../../_lib/user');
    const res = await handleConsents(new Request('https://x.test/api/legal/consents'), {
      verifySession: async () => ({ clerkUserId: 'clerk_x' }),
      resolveUser: async () => {
        throw new UserNotFoundError();
      },
    });
    expect(res.status).toBe(404);
  });
});

/**
 * api/_lib/clerk.ts 単体テスト (Clerk session 検証)
 * 由来: 001_auth_SPEC.md §1.3 / §4.1 (verifyClerkSession 401)
 */
import { describe, it, expect, vi } from 'vitest';
import { extractBearerToken, verifyClerkSession, UnauthorizedError } from './clerk';

function reqWithAuth(auth?: string): Request {
  const headers = new Headers();
  if (auth !== undefined) headers.set('authorization', auth);
  return new Request('https://app/api/auth/spam-check', { method: 'POST', headers });
}

describe('extractBearerToken', () => {
  it('Bearer トークンを取り出す', () => {
    expect(extractBearerToken('Bearer abc.def.ghi')).toBe('abc.def.ghi');
  });

  it('ヘッダ欠如 / 形式不正 / 空は UnauthorizedError', () => {
    expect(() => extractBearerToken(undefined)).toThrow(UnauthorizedError);
    expect(() => extractBearerToken('Token abc')).toThrow(UnauthorizedError);
    expect(() => extractBearerToken('Bearer   ')).toThrow(UnauthorizedError);
  });
});

describe('verifyClerkSession', () => {
  it('検証成功なら clerkUserId (sub) を返す', async () => {
    const verify = vi.fn(async () => ({ sub: 'user_abc' }));
    const out = await verifyClerkSession(reqWithAuth('Bearer tok'), {
      verify,
      secretKey: 'sk_test_x',
    });
    expect(out).toEqual({ clerkUserId: 'user_abc' });
    expect(verify).toHaveBeenCalledWith('tok', { secretKey: 'sk_test_x' });
  });

  it('ヘッダ無しは UnauthorizedError', async () => {
    await expect(
      verifyClerkSession(reqWithAuth(undefined), { verify: vi.fn(), secretKey: 'sk' }),
    ).rejects.toBeInstanceOf(UnauthorizedError);
  });

  it('verify が throw したら UnauthorizedError に正規化', async () => {
    const verify = vi.fn(async () => {
      throw new Error('expired');
    });
    await expect(
      verifyClerkSession(reqWithAuth('Bearer tok'), { verify, secretKey: 'sk' }),
    ).rejects.toBeInstanceOf(UnauthorizedError);
  });

  it('sub 欠落は UnauthorizedError', async () => {
    const verify = vi.fn(async () => ({ sub: '' }));
    await expect(
      verifyClerkSession(reqWithAuth('Bearer tok'), { verify, secretKey: 'sk' }),
    ).rejects.toBeInstanceOf(UnauthorizedError);
  });
});

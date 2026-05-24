/**
 * link.ts 単体テスト (Google OAuth Linking ロジック)
 * 由来: 003_auth_UNIT_TEST.md §1.2 (L01/L02/L05/L06/L07/L08) + §1.5 (E02)
 */
import { describe, it, expect, vi } from 'vitest';
import {
  getIdentities,
  isLinked,
  linkWithGoogle,
  assertValidCallbackUrl,
  assertStateMatches,
  type LinkableUser,
} from './link';
import { OAuthCallbackError } from './errors';

describe('isLinked / getIdentities', () => {
  it('UT-AU-L07: anonymous のみなら false', () => {
    expect(isLinked([])).toBe(false);
    expect(isLinked(undefined)).toBe(false);
  });

  it('UT-AU-L08: google 連携済なら true (oauth_ 接頭辞も正規化)', () => {
    expect(isLinked([{ provider: 'oauth_google' }])).toBe(true);
    expect(isLinked([{ provider: 'google' }])).toBe(true);
  });

  it('UT-AU-L06: getIdentities は provider/email を正規化して返す', () => {
    const ids = getIdentities([{ provider: 'oauth_google', emailAddress: 'a@example.com' }]);
    expect(ids).toEqual([{ provider: 'google', email: 'a@example.com' }]);
  });
});

describe('linkWithGoogle', () => {
  it('UT-AU-L01: 未連携なら createExternalAccount + redirect', async () => {
    const redirect = vi.fn();
    const user: LinkableUser = {
      externalAccounts: [],
      createExternalAccount: vi.fn(async () => ({
        verification: { externalVerificationRedirectURL: 'https://accounts.google.com/o/oauth2' },
      })),
    };
    await linkWithGoogle(user, { redirectUrl: 'https://app/auth/callback', redirect });
    expect(user.createExternalAccount).toHaveBeenCalledWith({
      strategy: 'oauth_google',
      redirectUrl: 'https://app/auth/callback',
    });
    expect(redirect).toHaveBeenCalledWith('https://accounts.google.com/o/oauth2');
  });

  it('UT-AU-L02: 既に連携済なら NoOp (createExternalAccount を呼ばない)', async () => {
    const info = vi.spyOn(console, 'info').mockImplementation(() => {});
    const user: LinkableUser = {
      externalAccounts: [{ provider: 'google' }],
      createExternalAccount: vi.fn(),
    };
    await linkWithGoogle(user, { redirectUrl: 'https://app/auth/callback', redirect: vi.fn() });
    expect(user.createExternalAccount).not.toHaveBeenCalled();
    expect(info).toHaveBeenCalled();
    info.mockRestore();
  });

  it('UT-AU-L05: 重複アカウントエラーは OAuthCallbackError(identity_already_exists)', async () => {
    const user: LinkableUser = {
      externalAccounts: [],
      createExternalAccount: vi.fn(async () => {
        throw { errors: [{ code: 'identity_already_exists' }] };
      }),
    };
    await expect(
      linkWithGoogle(user, { redirectUrl: 'https://app/auth/callback', redirect: vi.fn() }),
    ).rejects.toMatchObject({ name: 'OAuthCallbackError', code: 'identity_already_exists' });
  });
});

describe('assertValidCallbackUrl', () => {
  it('http/https は通す', () => {
    expect(assertValidCallbackUrl('https://app/auth/callback').protocol).toBe('https:');
  });

  it('UT-AU-E02: ftp:// 等は OAuthCallbackError(invalid_url)', () => {
    expect(() => assertValidCallbackUrl('ftp://example')).toThrow(OAuthCallbackError);
    expect(() => assertValidCallbackUrl('not a url')).toThrow(OAuthCallbackError);
  });
});

describe('assertStateMatches', () => {
  it('一致なら通す', () => {
    expect(() => assertStateMatches('abc', 'abc')).not.toThrow();
  });

  it('UT-AU-L04: 不一致 / null は OAuthCallbackError(state_mismatch)', () => {
    expect(() => assertStateMatches('abc', 'xyz')).toThrow(OAuthCallbackError);
    expect(() => assertStateMatches(null, 'abc')).toThrow(OAuthCallbackError);
  });
});

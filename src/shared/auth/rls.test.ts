/**
 * rls.ts + errors.ts 単体テスト ([SEC-005] 認可)
 * 由来: 003_auth_UNIT_TEST.md §1.4 (UT-AU-R01〜R03)
 */
import { describe, it, expect } from 'vitest';
import { assertOwnUser } from './rls';
import { LinkRequiredError, AuthInitError, OAuthCallbackError } from './errors';

describe('assertOwnUser', () => {
  it('UT-AU-R01: 自分自身 → throw しない', () => {
    expect(() => assertOwnUser('user_A', 'user_A')).not.toThrow();
  });

  it('UT-AU-R02: 他人 → RLS violation throw', () => {
    expect(() => assertOwnUser('user_A', 'user_B')).toThrow(/RLS violation/);
  });

  it('id 欠落 → RLS violation throw', () => {
    expect(() => assertOwnUser('', 'user_B')).toThrow(/RLS violation/);
  });
});

describe('error 型 (UT-AU-R03)', () => {
  it('LinkRequiredError は Error 継承', () => {
    const e = new LinkRequiredError({ used: 3, max: 3, remaining: 0 });
    expect(e).toBeInstanceOf(Error);
    expect(e.name).toBe('LinkRequiredError');
  });

  it('AuthInitError は cause を保持', () => {
    const cause = new Error('network');
    const e = new AuthInitError('init failed', cause);
    expect(e).toBeInstanceOf(Error);
    expect(e.cause).toBe(cause);
  });

  it('OAuthCallbackError は code を保持', () => {
    const e = new OAuthCallbackError('state mismatch', 'state_mismatch');
    expect(e).toBeInstanceOf(Error);
    expect(e.code).toBe('state_mismatch');
  });
});

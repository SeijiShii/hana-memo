/**
 * guest-session.ts 単体テスト (Guest sign-in オーケストレーション)
 * 由来: 003_auth_UNIT_TEST.md §1.1 (S01/S02/S03) + §1.5 (E01 single-flight lock)
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ensureGuestSession, __resetGuestSessionLock } from './guest-session';
import { AuthInitError } from './errors';

beforeEach(() => {
  __resetGuestSessionLock();
});

describe('ensureGuestSession', () => {
  it('UT-AU-S02: 既に sign-in 済なら signInAsGuest を呼ばない', async () => {
    const signInAsGuest = vi.fn(async () => {});
    await ensureGuestSession({ isSignedIn: true, signInAsGuest });
    expect(signInAsGuest).not.toHaveBeenCalled();
  });

  it('UT-AU-S01: 未 sign-in なら signInAsGuest を 1 回呼ぶ', async () => {
    const signInAsGuest = vi.fn(async () => {});
    await ensureGuestSession({ isSignedIn: false, signInAsGuest });
    expect(signInAsGuest).toHaveBeenCalledTimes(1);
  });

  it('UT-AU-S03a: 初回失敗 → retry 成功なら resolve (計 2 回)', async () => {
    const signInAsGuest = vi
      .fn()
      .mockRejectedValueOnce(new Error('network'))
      .mockResolvedValueOnce(undefined);
    await expect(ensureGuestSession({ isSignedIn: false, signInAsGuest })).resolves.toBeUndefined();
    expect(signInAsGuest).toHaveBeenCalledTimes(2);
  });

  it('UT-AU-S03b: 2 回とも失敗なら AuthInitError を throw', async () => {
    const cause = new Error('rate limit');
    const signInAsGuest = vi.fn().mockRejectedValue(cause);
    await expect(ensureGuestSession({ isSignedIn: false, signInAsGuest })).rejects.toBeInstanceOf(
      AuthInitError,
    );
    expect(signInAsGuest).toHaveBeenCalledTimes(2);
  });

  it('UT-AU-E01: 並列 10 呼出でも signInAsGuest は 1 回のみ (single-flight)', async () => {
    let resolveSignIn: (() => void) | undefined;
    const signInAsGuest = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          resolveSignIn = resolve;
        }),
    );
    const calls = Array.from({ length: 10 }, () =>
      ensureGuestSession({ isSignedIn: false, signInAsGuest }),
    );
    // すべて in-flight Promise を共有しているはず
    resolveSignIn?.();
    await Promise.all(calls);
    expect(signInAsGuest).toHaveBeenCalledTimes(1);
  });

  it('完了後は lock が解放され、次回 (未 sign-in) で再度呼べる', async () => {
    const signInAsGuest = vi.fn(async () => {});
    await ensureGuestSession({ isSignedIn: false, signInAsGuest });
    await ensureGuestSession({ isSignedIn: false, signInAsGuest });
    expect(signInAsGuest).toHaveBeenCalledTimes(2);
  });
});

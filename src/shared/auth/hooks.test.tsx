// @vitest-environment happy-dom
/**
 * hooks.ts 単体テスト (AuthSnapshot → ドメイン形 正規化)
 * 由来: 003_auth_UNIT_TEST.md §1.1 (S04/S05), 002_auth_PLAN.md Phase 5
 *
 * hooks は AuthContext のみを読む (Clerk 直接依存は context.tsx の bridge に隔離)。
 * 本テストは AuthContext.Provider でスナップショットを注入して正規化を検証する。
 */
import { describe, it, expect } from 'vitest';
import { renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { useCurrentUser, useClerkUserId } from './hooks';
import { AuthContext, KEYLESS_AUTH, type AuthSnapshot } from './auth-context';

function wrapper(snapshot: AuthSnapshot) {
  return ({ children }: { children: ReactNode }) => (
    <AuthContext.Provider value={snapshot}>{children}</AuthContext.Provider>
  );
}

const snap = (over: Partial<AuthSnapshot>): AuthSnapshot => ({ ...KEYLESS_AUTH, ...over });

describe('useClerkUserId', () => {
  it('sign-in 済なら userId を返す', () => {
    const { result } = renderHook(() => useClerkUserId(), {
      wrapper: wrapper(snap({ isSignedIn: true, userId: 'user_1' })),
    });
    expect(result.current).toBe('user_1');
  });

  it('未 sign-in は null', () => {
    const { result } = renderHook(() => useClerkUserId(), { wrapper: wrapper(KEYLESS_AUTH) });
    expect(result.current).toBeNull();
  });

  it('provider 不在 (keyless) でも throw せず null', () => {
    const { result } = renderHook(() => useClerkUserId());
    expect(result.current).toBeNull();
  });
});

describe('useCurrentUser', () => {
  it('email あり (OAuth) → isAnonymous=false', () => {
    const { result } = renderHook(() => useCurrentUser(), {
      wrapper: wrapper(
        snap({
          isLoaded: true,
          isSignedIn: true,
          userId: 'user_1',
          email: 'a@example.com',
          hasExternalAccount: true,
        }),
      ),
    });
    expect(result.current).toEqual({
      isLoaded: true,
      isSignedIn: true,
      clerkUserId: 'user_1',
      email: 'a@example.com',
      isAnonymous: false,
    });
  });

  it('Guest (snapshot.isAnonymous=true) → isAnonymous=true', () => {
    const { result } = renderHook(() => useCurrentUser(), {
      wrapper: wrapper(
        snap({ isLoaded: true, isSignedIn: true, userId: 'guest_1', isAnonymous: true }),
      ),
    });
    expect(result.current.isAnonymous).toBe(true);
  });

  it('fix_001 回帰: Guest が合成 email を持っても isAnonymous=true (email で誤判定しない)', () => {
    // guest は Clerk instance 要件で合成 email (guest_*@guest.hana-memo.app) を持つ。
    // email 有無でなく publicMetadata 由来の snapshot.isAnonymous を権威ソースにする。
    const { result } = renderHook(() => useCurrentUser(), {
      wrapper: wrapper(
        snap({
          isLoaded: true,
          isSignedIn: true,
          userId: 'guest_1',
          email: 'guest_be3a5bf1@guest.hana-memo.app',
          isAnonymous: true,
        }),
      ),
    });
    expect(result.current.isAnonymous).toBe(true);
  });

  it('user 未確立 (userId なし) は isAnonymous=false', () => {
    const { result } = renderHook(() => useCurrentUser(), {
      wrapper: wrapper(snap({ isLoaded: false, isSignedIn: false })),
    });
    expect(result.current).toMatchObject({
      isLoaded: false,
      isSignedIn: false,
      clerkUserId: null,
      isAnonymous: false,
    });
  });

  it('provider 不在 (keyless) は未 sign-in の既定を返し throw しない', () => {
    const { result } = renderHook(() => useCurrentUser());
    expect(result.current).toEqual({
      isLoaded: true,
      isSignedIn: false,
      clerkUserId: null,
      email: null,
      isAnonymous: false,
    });
  });
});

// @vitest-environment happy-dom
/**
 * hooks.ts 単体テスト (Clerk user → ドメイン形 正規化)
 * 由来: 003_auth_UNIT_TEST.md §1.1 (S04/S05), 002_auth_PLAN.md Phase 5
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';

const useUserMock = vi.fn();
const useAuthMock = vi.fn();

vi.mock('@clerk/clerk-react', () => ({
  useUser: () => useUserMock(),
  useAuth: () => useAuthMock(),
}));

import { useCurrentUser, useClerkUserId } from './hooks';

beforeEach(() => {
  useUserMock.mockReset();
  useAuthMock.mockReset();
});

describe('useClerkUserId', () => {
  it('sign-in 済なら userId を返す', () => {
    useAuthMock.mockReturnValue({ userId: 'user_1' });
    const { result } = renderHook(() => useClerkUserId());
    expect(result.current).toBe('user_1');
  });

  it('未 sign-in は null', () => {
    useAuthMock.mockReturnValue({ userId: null });
    const { result } = renderHook(() => useClerkUserId());
    expect(result.current).toBeNull();
  });
});

describe('useCurrentUser', () => {
  it('email あり (OAuth) → isAnonymous=false', () => {
    useUserMock.mockReturnValue({
      isLoaded: true,
      isSignedIn: true,
      user: {
        id: 'user_1',
        primaryEmailAddress: { emailAddress: 'a@example.com' },
        externalAccounts: [{ provider: 'google' }],
      },
    });
    const { result } = renderHook(() => useCurrentUser());
    expect(result.current).toEqual({
      isLoaded: true,
      isSignedIn: true,
      clerkUserId: 'user_1',
      email: 'a@example.com',
      isAnonymous: false,
    });
  });

  it('email/external 無し (Guest) → isAnonymous=true', () => {
    useUserMock.mockReturnValue({
      isLoaded: true,
      isSignedIn: true,
      user: { id: 'guest_1', externalAccounts: [] },
    });
    const { result } = renderHook(() => useCurrentUser());
    expect(result.current.isAnonymous).toBe(true);
    expect(result.current.email).toBeNull();
  });

  it('user 未ロードは isAnonymous=false (user が null のため)', () => {
    useUserMock.mockReturnValue({ isLoaded: false, isSignedIn: false, user: null });
    const { result } = renderHook(() => useCurrentUser());
    expect(result.current).toMatchObject({
      isLoaded: false,
      isSignedIn: false,
      clerkUserId: null,
      isAnonymous: false,
    });
  });
});

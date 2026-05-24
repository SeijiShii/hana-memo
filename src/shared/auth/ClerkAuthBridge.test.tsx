// @vitest-environment happy-dom
/**
 * ClerkAuthBridge 単体テスト — Clerk hooks を AuthSnapshot に正規化すること、
 * および provider 不在時に KEYLESS_AUTH 既定が使われること (keyless graceful の要)。
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';

const useAuthMock = vi.fn();
const useUserMock = vi.fn();
vi.mock('@clerk/clerk-react', () => ({
  useAuth: () => useAuthMock(),
  useUser: () => useUserMock(),
}));

import { ClerkAuthBridge } from './ClerkAuthBridge';
import { useAuthSnapshot, KEYLESS_AUTH } from './auth-context';

beforeEach(() => {
  useAuthMock.mockReset();
  useUserMock.mockReset();
});

describe('useAuthSnapshot (provider 不在)', () => {
  it('ClerkAuthBridge 無しなら KEYLESS_AUTH 既定 (未 sign-in / token null)', async () => {
    const { result } = renderHook(() => useAuthSnapshot());
    expect(result.current.isSignedIn).toBe(false);
    expect(result.current.userId).toBeNull();
    expect(await result.current.getToken()).toBeNull();
    expect(result.current).toBe(KEYLESS_AUTH);
  });
});

describe('ClerkAuthBridge', () => {
  const bridge = (children: ReactNode) => <ClerkAuthBridge>{children}</ClerkAuthBridge>;

  it('Clerk の user / auth を snapshot に正規化する (OAuth)', async () => {
    useAuthMock.mockReturnValue({
      isLoaded: true,
      isSignedIn: true,
      userId: 'user_1',
      getToken: async () => 'jwt-abc',
    });
    useUserMock.mockReturnValue({
      user: {
        id: 'user_1',
        primaryEmailAddress: { emailAddress: 'a@example.com' },
        externalAccounts: [{ provider: 'google' }],
      },
    });
    const { result } = renderHook(() => useAuthSnapshot(), {
      wrapper: ({ children }) => bridge(children),
    });
    expect(result.current).toMatchObject({
      isLoaded: true,
      isSignedIn: true,
      userId: 'user_1',
      email: 'a@example.com',
      hasExternalAccount: true,
    });
    expect(await result.current.getToken()).toBe('jwt-abc');
  });

  it('Guest (email/external 無し) → email null / hasExternalAccount false', () => {
    useAuthMock.mockReturnValue({
      isLoaded: true,
      isSignedIn: true,
      userId: 'guest_1',
      getToken: async () => null,
    });
    useUserMock.mockReturnValue({ user: { id: 'guest_1', externalAccounts: [] } });
    const { result } = renderHook(() => useAuthSnapshot(), {
      wrapper: ({ children }) => bridge(children),
    });
    expect(result.current.email).toBeNull();
    expect(result.current.hasExternalAccount).toBe(false);
    expect(result.current.userId).toBe('guest_1');
  });

  it('getToken が null を返しても snapshot.getToken は null に正規化', async () => {
    useAuthMock.mockReturnValue({
      isLoaded: true,
      isSignedIn: false,
      userId: null,
      getToken: async () => null,
    });
    useUserMock.mockReturnValue({ user: null });
    const { result } = renderHook(() => useAuthSnapshot(), {
      wrapper: ({ children }) => bridge(children),
    });
    expect(await result.current.getToken()).toBeNull();
  });
});

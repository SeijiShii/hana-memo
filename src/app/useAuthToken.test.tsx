// @vitest-environment happy-dom
/**
 * useAuthToken 単体テスト — AuthSnapshot.getToken (async) を同期 token state に解決する。
 * keyless (provider 不在) でも throw せず token=null を返すことを含む。
 */
import { describe, it, expect } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { useAuthToken } from './useAuthToken';
import { AuthContext, KEYLESS_AUTH, type AuthSnapshot } from '../shared/auth/auth-context';

function wrapper(snapshot: AuthSnapshot) {
  return ({ children }: { children: ReactNode }) => (
    <AuthContext.Provider value={snapshot}>{children}</AuthContext.Provider>
  );
}
const snap = (over: Partial<AuthSnapshot>): AuthSnapshot => ({ ...KEYLESS_AUTH, ...over });

describe('useAuthToken', () => {
  it('sign-in 済 → getToken の解決値を token に格納', async () => {
    const { result } = renderHook(() => useAuthToken(), {
      wrapper: wrapper(snap({ isLoaded: true, isSignedIn: true, getToken: async () => 'jwt-xyz' })),
    });
    await waitFor(() => expect(result.current.token).toBe('jwt-xyz'));
    expect(result.current.isSignedIn).toBe(true);
  });

  it('未 sign-in → token は null のまま', async () => {
    const { result } = renderHook(() => useAuthToken(), {
      wrapper: wrapper(snap({ isLoaded: true, isSignedIn: false })),
    });
    expect(result.current.token).toBeNull();
    expect(result.current.isSignedIn).toBe(false);
  });

  it('provider 不在 (keyless) でも throw せず token=null', () => {
    const { result } = renderHook(() => useAuthToken());
    expect(result.current.token).toBeNull();
    expect(result.current.isSignedIn).toBe(false);
  });

  it('getToken が reject しても token=null に倒れる', async () => {
    const { result } = renderHook(() => useAuthToken(), {
      wrapper: wrapper(
        snap({
          isLoaded: true,
          isSignedIn: true,
          getToken: async () => {
            throw new Error('clerk down');
          },
        }),
      ),
    });
    await waitFor(() => expect(result.current.token).toBeNull());
  });
});

// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { createElement } from 'react';

const useSignInMock = vi.fn();
vi.mock('@clerk/clerk-react', () => ({
  useSignIn: () => useSignInMock(),
}));

import { AuthContext, KEYLESS_AUTH, type AuthSnapshot } from './auth-context';
import { __resetGuestSessionLock } from './guest-session';
import { useGuestSession } from './useGuestSession';

function wrapperWith(snapshot: Partial<AuthSnapshot>) {
  const value: AuthSnapshot = { ...KEYLESS_AUTH, ...snapshot };
  return ({ children }: { children: ReactNode }) =>
    createElement(AuthContext.Provider, { value }, children);
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

beforeEach(() => {
  useSignInMock.mockReset();
  __resetGuestSessionLock();
});

describe('useGuestSession', () => {
  it('UT-AU-US01: 未 sign-in → ticket 取得→signIn.create→setActive で active', async () => {
    const create = vi.fn(async () => ({ createdSessionId: 'sess_1' }));
    const setActive = vi.fn(async () => {});
    useSignInMock.mockReturnValue({ isLoaded: true, signIn: { create }, setActive });
    const fetchFn = vi.fn(async () => jsonResponse({ ticket: 'tkt_1' }));

    const { result } = renderHook(() => useGuestSession({ fetchFn: fetchFn as unknown as typeof fetch }), {
      wrapper: wrapperWith({ isLoaded: true, isSignedIn: false }),
    });

    await waitFor(() => expect(result.current.status).toBe('active'));
    expect(fetchFn).toHaveBeenCalledTimes(1);
    expect(create).toHaveBeenCalledWith({ strategy: 'ticket', ticket: 'tkt_1' });
    expect(setActive).toHaveBeenCalledWith({ session: 'sess_1' });
  });

  it('UT-AU-US02: 既に sign-in 済 → no-op (ticket fetch しない)', async () => {
    const create = vi.fn();
    const setActive = vi.fn();
    useSignInMock.mockReturnValue({ isLoaded: true, signIn: { create }, setActive });
    const fetchFn = vi.fn();

    const { result } = renderHook(() => useGuestSession({ fetchFn: fetchFn as unknown as typeof fetch }), {
      wrapper: wrapperWith({ isLoaded: true, isSignedIn: true, userId: 'u1' }),
    });

    await waitFor(() => expect(result.current.status).toBe('active'));
    expect(fetchFn).not.toHaveBeenCalled();
    expect(create).not.toHaveBeenCalled();
  });

  it('Clerk 未ロード中は何もしない (idle)', async () => {
    useSignInMock.mockReturnValue({ isLoaded: false, signIn: undefined, setActive: undefined });
    const fetchFn = vi.fn();
    const { result } = renderHook(() => useGuestSession({ fetchFn: fetchFn as unknown as typeof fetch }), {
      wrapper: wrapperWith({ isLoaded: false, isSignedIn: false }),
    });
    expect(result.current.status).toBe('idle');
    expect(fetchFn).not.toHaveBeenCalled();
  });

  it('UT-AU-US03: ticket 取得失敗 → retry 後も失敗で error', async () => {
    const create = vi.fn(async () => ({ createdSessionId: 'sess_1' }));
    const setActive = vi.fn(async () => {});
    useSignInMock.mockReturnValue({ isLoaded: true, signIn: { create }, setActive });
    const fetchFn = vi.fn(async () => jsonResponse({ error: 'guest_provision_failed' }, 503));

    const { result } = renderHook(() => useGuestSession({ fetchFn: fetchFn as unknown as typeof fetch }), {
      wrapper: wrapperWith({ isLoaded: true, isSignedIn: false }),
    });

    await waitFor(() => expect(result.current.status).toBe('error'));
    expect(create).not.toHaveBeenCalled();
  });
});

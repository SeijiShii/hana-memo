import { describe, it, expect, vi } from 'vitest';
import { fetchGuestTicket, buildGuestSignIn, GuestTicketError } from './guest-client';

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

describe('fetchGuestTicket', () => {
  it('UT-AU-GC01: 200 → ticket を返し、POST /api/auth/guest に fingerprint を送る', async () => {
    const fetchFn = vi.fn(async (_url: RequestInfo | URL, _init?: RequestInit) =>
      jsonResponse({ ticket: 'tkt_1' }),
    );
    const ticket = await fetchGuestTicket(fetchFn as unknown as typeof fetch, {
      fingerprint: 'fp1',
    });
    expect(ticket).toBe('tkt_1');
    const [url, init] = fetchFn.mock.calls[0]!;
    expect(String(url)).toBe('/api/auth/guest');
    expect(init?.method).toBe('POST');
    expect(JSON.parse(init?.body as string)).toEqual({ fingerprint: 'fp1' });
  });

  it('UT-AU-GC02: 429 → GuestTicketRateLimitedError(reason)', async () => {
    const fetchFn = vi.fn(async () => jsonResponse({ error: 'must_link' }, 429));
    await expect(fetchGuestTicket(fetchFn as unknown as typeof fetch)).rejects.toMatchObject({
      name: 'GuestTicketRateLimitedError',
      reason: 'must_link',
    });
  });

  it('UT-AU-GC03: 503 → GuestTicketError', async () => {
    const fetchFn = vi.fn(async () => jsonResponse({ error: 'x' }, 503));
    await expect(fetchGuestTicket(fetchFn as unknown as typeof fetch)).rejects.toBeInstanceOf(
      GuestTicketError,
    );
  });

  it('network 失敗 → GuestTicketError', async () => {
    const fetchFn = vi.fn(async () => {
      throw new Error('net');
    });
    await expect(fetchGuestTicket(fetchFn as unknown as typeof fetch)).rejects.toBeInstanceOf(
      GuestTicketError,
    );
  });

  it('ticket 欠落レスポンス → GuestTicketError', async () => {
    const fetchFn = vi.fn(async () => jsonResponse({}));
    await expect(fetchGuestTicket(fetchFn as unknown as typeof fetch)).rejects.toBeInstanceOf(
      GuestTicketError,
    );
  });
});

describe('buildGuestSignIn', () => {
  it('UT-AU-US01: fetchTicket→signInCreate({strategy:ticket})→setActive(sessionId)', async () => {
    const fetchTicket = vi.fn(async () => 'tkt_9');
    const signInCreate = vi.fn(async () => ({ createdSessionId: 'sess_1' }));
    const setActive = vi.fn(async () => {});
    const signInAsGuest = buildGuestSignIn({ fetchTicket, signInCreate, setActive });
    await signInAsGuest();
    expect(signInCreate).toHaveBeenCalledWith({ strategy: 'ticket', ticket: 'tkt_9' });
    expect(setActive).toHaveBeenCalledWith({ session: 'sess_1' });
  });

  it('createdSessionId が null → エラー (setActive を呼ばない)', async () => {
    const setActive = vi.fn(async () => {});
    const signInAsGuest = buildGuestSignIn({
      fetchTicket: async () => 't',
      signInCreate: async () => ({ createdSessionId: null }),
      setActive,
    });
    await expect(signInAsGuest()).rejects.toBeInstanceOf(GuestTicketError);
    expect(setActive).not.toHaveBeenCalled();
  });
});

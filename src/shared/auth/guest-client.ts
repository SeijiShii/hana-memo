/**
 * 匿名サインインのフロント側 SDK 非依存ヘルパ (revise_001)。
 *
 * - `fetchGuestTicket`: `/api/auth/guest` から sign-in ticket を取得 (fetch 注入で単体テスト可)
 * - `buildGuestSignIn`: ticket 取得 → `signIn.create({strategy:'ticket'})` → `setActive` を
 *   `GuestSignInFn` (ensureGuestSession が受け取る形) に組み立てる純関数
 *
 * Clerk SDK には直接依存しない (signInCreate/setActive を注入)。Clerk hook 配線は
 * `./useGuestSession.ts` が担う。
 *
 * 関連: docs/_shared/auth/revise_001_20260525_clerk-ticket-guest-auth/002_REVISE_PLAN.md,
 *       003_REVISE_UNIT_TEST.md §1 (UT-AU-GC01〜03, UT-AU-US01)
 */
import type { GuestSignInFn } from './guest-session';

/** `/api/auth/guest` のレート超過 (429)。短時間リトライ可。 */
export class GuestTicketRateLimitedError extends Error {
  constructor(public readonly reason: string = 'rate_limited') {
    super(reason);
    this.name = 'GuestTicketRateLimitedError';
  }
}

/** ticket 取得のその他失敗 (5xx / network / 不正レスポンス)。 */
export class GuestTicketError extends Error {
  constructor(message = 'guest_ticket_failed', options?: { cause?: unknown }) {
    super(message, options);
    this.name = 'GuestTicketError';
  }
}

/** `/api/auth/guest` を叩いて ticket 文字列を得る。 */
export async function fetchGuestTicket(
  fetchFn: typeof fetch,
  opts: { fingerprint?: string } = {},
): Promise<string> {
  let res: Response;
  try {
    res = await fetchFn('/api/auth/guest', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ fingerprint: opts.fingerprint ?? '' }),
    });
  } catch (err) {
    throw new GuestTicketError('guest ticket request failed', { cause: err });
  }
  if (res.status === 429) {
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    throw new GuestTicketRateLimitedError(body.error ?? 'rate_limited');
  }
  if (!res.ok) {
    throw new GuestTicketError(`guest ticket failed: ${res.status}`);
  }
  const data = (await res.json().catch(() => ({}))) as { ticket?: unknown };
  if (typeof data.ticket !== 'string' || !data.ticket) {
    throw new GuestTicketError('guest ticket missing in response');
  }
  return data.ticket;
}

/** Clerk の ticket sign-in プリミティブ (SDK 形に依存しない最小 shape)。 */
export type GuestSignInPrimitives = {
  fetchTicket: () => Promise<string>;
  signInCreate: (params: {
    strategy: 'ticket';
    ticket: string;
  }) => Promise<{ createdSessionId: string | null }>;
  setActive: (params: { session: string }) => Promise<void>;
};

/** ticket 方式の `signInAsGuest` を組み立てる (ensureGuestSession に注入する形)。 */
export function buildGuestSignIn(p: GuestSignInPrimitives): GuestSignInFn {
  return async () => {
    const ticket = await p.fetchTicket();
    const res = await p.signInCreate({ strategy: 'ticket', ticket });
    if (!res.createdSessionId) {
      throw new GuestTicketError('guest sign-in did not create a session');
    }
    await p.setActive({ session: res.createdSessionId });
  };
}

/**
 * billing frontend API ラッパ (Vercel Function を叩く純粋関数群)
 *
 * - `createCheckout`: POST /api/billing/create-checkout-session → redirect URL
 * - `fetchBillingStatus`: GET /api/billing/status → ai_credits_remaining
 * - `confirmCheckout`: GET /api/billing/confirm を poll し Webhook 反映を待つ (SC01〜SC03)
 *
 * 注: 元 PLAN の Supabase Realtime は Vercel+Neon 構成に無いため、status は明示 fetch / poll で代替。
 * 関連: docs/billing/001_billing_SPEC.md §1.1, 003_billing_UNIT_TEST.md §1.3-1.5 (A/SC/H)
 */
import { LinkRequiredError } from '../../shared/auth/errors';
import { CheckoutFailedError, CheckoutPendingError } from './errors';

export type CheckoutInput = { type: 'ai_credits'; quantity: number };

export type BillingApiOptions = {
  token: string;
  fetchFn?: typeof fetch;
  endpoint?: string;
};

const CREATE_ENDPOINT = '/api/billing/create-checkout-session';
const STATUS_ENDPOINT = '/api/billing/status';
const CONFIRM_ENDPOINT = '/api/billing/confirm';

function authHeaders(token: string): Record<string, string> {
  return { authorization: `Bearer ${token}`, 'content-type': 'application/json' };
}

/** Checkout Session を作成して redirect URL を返す (UT-BL-A01/A02/A03)。 */
export async function createCheckout(
  input: CheckoutInput,
  opts: BillingApiOptions,
): Promise<{ url: string; sessionId: string }> {
  const fetchFn = opts.fetchFn ?? fetch;
  let res: Response;
  try {
    res = await fetchFn(opts.endpoint ?? CREATE_ENDPOINT, {
      method: 'POST',
      headers: authHeaders(opts.token),
      body: JSON.stringify(input),
    });
  } catch (err) {
    throw new CheckoutFailedError('checkout network error', err);
  }
  if (res.ok) {
    return (await res.json()) as { url: string; sessionId: string };
  }
  if (res.status === 401) {
    throw new LinkRequiredError();
  }
  throw new CheckoutFailedError(`checkout failed: ${res.status}`);
}

export type BillingStatus = {
  aiCreditsRemaining: number;
  /** identify 実効残数 (匿名 trial / 登録 月次無料+credits)。fix_001。旧 server 互換のため optional。 */
  quotaRemaining?: number;
};

/** 課金ステータス (残クレジット) を取得する (UT-BL-H01)。 */
export async function fetchBillingStatus(opts: BillingApiOptions): Promise<BillingStatus> {
  const fetchFn = opts.fetchFn ?? fetch;
  const res = await fetchFn(opts.endpoint ?? STATUS_ENDPOINT, {
    method: 'GET',
    headers: authHeaders(opts.token),
  });
  if (!res.ok) {
    throw new CheckoutFailedError(`status failed: ${res.status}`);
  }
  return (await res.json()) as BillingStatus;
}

export type ConfirmResult =
  | { found: false }
  | {
      found: true;
      type: 'ai_credits';
      aiCreditsRemaining: number;
    };

export type ConfirmOptions = BillingApiOptions & {
  /** poll 間隔 (既定 1000ms)。 */
  pollIntervalMs?: number;
  /** 全体タイムアウト (既定 30000ms、UT-BL-SC02)。 */
  timeoutMs?: number;
  /** sleep 注入 (テスト用)。 */
  sleep?: (ms: number) => Promise<void>;
};

const defaultSleep = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));

/**
 * session_id で billing_unlocks を poll し Webhook 反映を待つ。
 * - 反映済 → 即 resolve (UT-BL-SC01 / SC03)
 * - timeout まで未反映 → CheckoutPendingError (UT-BL-SC02)
 */
export async function confirmCheckout(
  sessionId: string,
  opts: ConfirmOptions,
): Promise<Extract<ConfirmResult, { found: true }>> {
  const fetchFn = opts.fetchFn ?? fetch;
  const sleep = opts.sleep ?? defaultSleep;
  const interval = opts.pollIntervalMs ?? 1000;
  const timeout = opts.timeoutMs ?? 30000;
  const base = opts.endpoint ?? CONFIRM_ENDPOINT;
  const url = `${base}?session_id=${encodeURIComponent(sessionId)}`;

  let elapsed = 0;
  for (;;) {
    const res = await fetchFn(url, { method: 'GET', headers: authHeaders(opts.token) });
    if (res.ok) {
      const body = (await res.json()) as ConfirmResult;
      if (body.found) {
        return body;
      }
    }
    if (elapsed >= timeout) {
      throw new CheckoutPendingError();
    }
    await sleep(interval);
    elapsed += interval;
  }
}

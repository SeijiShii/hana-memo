/**
 * billing/api.ts 単体テスト (Checkout 作成 / ステータス取得 / 決済確定 poll)
 * 由来: docs/billing/003_billing_UNIT_TEST.md §1.3-1.5 (UT-BL-A01〜A03, SC01〜SC03)
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createCheckout, fetchBillingStatus, confirmCheckout } from './api';
import { CheckoutFailedError, CheckoutPendingError } from './errors';
import { LinkRequiredError } from '../../shared/auth/errors';

function jsonRes(body: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  } as Response;
}

let errSpy: ReturnType<typeof vi.spyOn>;
beforeEach(() => {
  errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
});
afterEach(() => {
  errSpy.mockRestore();
});

describe('createCheckout', () => {
  it('UT-BL-A01: ai_credits → Edge Fn 呼出 + url 取得', async () => {
    const fetchFn = vi.fn<typeof fetch>(async () =>
      jsonRes({ url: 'https://checkout/cs_1', sessionId: 'cs_1' }),
    );
    const out = await createCheckout({ type: 'ai_credits', quantity: 1 }, { token: 't', fetchFn });
    expect(out).toEqual({ url: 'https://checkout/cs_1', sessionId: 'cs_1' });
    const [, init] = fetchFn.mock.calls[0]!;
    expect(init?.method).toBe('POST');
    expect(JSON.parse(String(init?.body))).toEqual({ type: 'ai_credits', quantity: 1 });
  });

  it('UT-BL-A03: network err → CheckoutFailedError', async () => {
    const fetchFn = vi.fn<typeof fetch>(async () => {
      throw new Error('offline');
    });
    await expect(
      createCheckout({ type: 'ai_credits', quantity: 1 }, { token: 't', fetchFn }),
    ).rejects.toBeInstanceOf(CheckoutFailedError);
  });

  it('401 → LinkRequiredError (匿名 user)', async () => {
    const fetchFn = vi.fn<typeof fetch>(async () => jsonRes({ error: 'link_required' }, 401));
    await expect(
      createCheckout({ type: 'ai_credits', quantity: 1 }, { token: 't', fetchFn }),
    ).rejects.toBeInstanceOf(LinkRequiredError);
  });
});

describe('fetchBillingStatus', () => {
  it('GET → ai_credits_remaining', async () => {
    const fetchFn = vi.fn<typeof fetch>(async () => jsonRes({ aiCreditsRemaining: 40 }));
    const out = await fetchBillingStatus({ token: 't', fetchFn });
    expect(out).toEqual({ aiCreditsRemaining: 40 });
  });

  it('5xx → CheckoutFailedError', async () => {
    const fetchFn = vi.fn<typeof fetch>(async () => jsonRes({ error: 'internal' }, 500));
    await expect(fetchBillingStatus({ token: 't', fetchFn })).rejects.toBeInstanceOf(
      CheckoutFailedError,
    );
  });
});

describe('confirmCheckout', () => {
  const noSleep = vi.fn(async () => {});

  it('UT-BL-SC01: 反映済 → 即 resolve', async () => {
    const fetchFn = vi.fn<typeof fetch>(async () =>
      jsonRes({ found: true, type: 'ai_credits', aiCreditsRemaining: 40 }),
    );
    const out = await confirmCheckout('cs_1', { token: 't', fetchFn, sleep: noSleep });
    expect(out.found).toBe(true);
    expect(out.type).toBe('ai_credits');
    expect(fetchFn).toHaveBeenCalledOnce();
  });

  it('UT-BL-SC03: 2 回目で反映 → 新クレジットで resolve', async () => {
    const fetchFn = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(jsonRes({ found: false }))
      .mockResolvedValueOnce(jsonRes({ found: true, type: 'ai_credits', aiCreditsRemaining: 60 }));
    const out = await confirmCheckout('cs_1', {
      token: 't',
      fetchFn,
      sleep: noSleep,
      pollIntervalMs: 100,
      timeoutMs: 1000,
    });
    expect(out.aiCreditsRemaining).toBe(60);
    expect(fetchFn).toHaveBeenCalledTimes(2);
  });

  it('UT-BL-SC02: timeout まで未反映 → CheckoutPendingError', async () => {
    const fetchFn = vi.fn<typeof fetch>(async () => jsonRes({ found: false }));
    await expect(
      confirmCheckout('cs_1', {
        token: 't',
        fetchFn,
        sleep: noSleep,
        pollIntervalMs: 1000,
        timeoutMs: 3000,
      }),
    ).rejects.toBeInstanceOf(CheckoutPendingError);
    // elapsed 0,1000,2000,3000 で 4 回 fetch 後に timeout
    expect(fetchFn).toHaveBeenCalledTimes(4);
  });
});

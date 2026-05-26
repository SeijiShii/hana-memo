/**
 * stripe-webhook 単体テスト (署名検証 + idempotent 適用のオーケストレーション)
 * 由来: docs/billing/003_billing_UNIT_TEST.md §1.2 (UT-BL-WH01〜WH07)
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { processStripeWebhook } from './stripe-webhook';
import type { BillingStore, StripeCheckoutEvent } from '../../src/features/billing/webhook';

function makeStore(overrides: Partial<BillingStore> = {}): BillingStore {
  return {
    isEventProcessed: vi.fn(async () => false),
    recordEvent: vi.fn(async () => {}),
    insertUnlock: vi.fn(async () => {}),
    grantCredits: vi.fn(async () => {}),
    ...overrides,
  };
}

const creditsEvent: StripeCheckoutEvent = {
  id: 'evt_1',
  type: 'checkout.session.completed',
  data: {
    object: {
      id: 'cs_1',
      payment_intent: 'pi_1',
      amount_total: 100,
      metadata: { userId: 'u1', type: 'ai_credits', quantity: '1' },
    },
  },
};

let errSpy: ReturnType<typeof vi.spyOn>;
beforeEach(() => {
  errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
});
afterEach(() => {
  errSpy.mockRestore();
});

describe('processStripeWebhook', () => {
  it('UT-BL-WH04: 署名不一致 → 401、store 未呼出 (Stripe retry しない)', async () => {
    const store = makeStore();
    const verify = vi.fn(() => {
      throw new Error('signature mismatch');
    });
    const res = await processStripeWebhook('raw', 'bad-sig', { verify, store });
    expect(res.status).toBe(401);
    expect(res.body.ok).toBe(false);
    expect(store.insertUnlock).not.toHaveBeenCalled();
  });

  it('UT-BL-WH01: 正常 checkout.session.completed → 200 applied + credits 付与', async () => {
    const store = makeStore();
    const verify = vi.fn(() => creditsEvent);
    const res = await processStripeWebhook('raw', 'sig', { verify, store });
    expect(res.status).toBe(200);
    expect(res.body.applied).toBe(true);
    expect(store.insertUnlock).toHaveBeenCalledOnce();
    expect(store.grantCredits).toHaveBeenCalledWith('u1', 10); // 10 × 1 (revise_001)
    expect(store.recordEvent).toHaveBeenCalledWith('evt_1', 'stripe');
  });

  it('UT-BL-WH03: 重複 event.id → applied=false (べき等)', async () => {
    const store = makeStore({ isEventProcessed: vi.fn(async () => true) });
    const verify = vi.fn(() => creditsEvent);
    const res = await processStripeWebhook('raw', 'sig', { verify, store });
    expect(res.status).toBe(200);
    expect(res.body.applied).toBe(false);
    expect(store.insertUnlock).not.toHaveBeenCalled();
  });

  it('UT-BL-WH07: DB INSERT 失敗 → 500 (Stripe が retry)', async () => {
    const store = makeStore({
      insertUnlock: vi.fn(async () => {
        throw new Error('db down');
      }),
    });
    const verify = vi.fn(() => creditsEvent);
    const res = await processStripeWebhook('raw', 'sig', { verify, store });
    expect(res.status).toBe(500);
    expect(res.body.ok).toBe(false);
    expect(errSpy).toHaveBeenCalled();
  });

  it('未対応 event type → 200 applied=false (ignore、event 記録のみ)', async () => {
    const store = makeStore();
    const verify = vi.fn(
      (): StripeCheckoutEvent => ({
        id: 'evt_x',
        type: 'invoice.paid',
        data: { object: { id: 'in_1' } },
      }),
    );
    const res = await processStripeWebhook('raw', 'sig', { verify, store });
    expect(res.status).toBe(200);
    expect(res.body.applied).toBe(false);
    expect(store.recordEvent).toHaveBeenCalledWith('evt_x', 'stripe');
  });
});

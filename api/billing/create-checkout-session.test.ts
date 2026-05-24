/**
 * create-checkout-session 単体テスト (Checkout 発行オーケストレーション + 価格/数量検証)
 * 由来: docs/billing/003_billing_UNIT_TEST.md §1.1 (UT-BL-CS01〜CS07)
 */
import { describe, it, expect, vi } from 'vitest';
import {
  parseCheckoutBody,
  buildCheckoutParams,
  runCreateCheckout,
  type CheckoutInput,
} from './create-checkout-session';
import { InvalidAmountError } from '../../src/features/billing/errors';
import { LinkRequiredError } from '../../src/shared/auth/errors';

const okCreate = vi.fn(async () => ({ id: 'cs_1', url: 'https://checkout.stripe.com/c/cs_1' }));

describe('parseCheckoutBody', () => {
  it('ai_credits を正規化', () => {
    expect(parseCheckoutBody({ type: 'ai_credits', quantity: 3 })).toEqual({
      type: 'ai_credits',
      quantity: 3,
    });
  });
  it('pdf_unlock を正規化', () => {
    expect(parseCheckoutBody({ type: 'pdf_unlock', amountJpy: 500 })).toEqual({
      type: 'pdf_unlock',
      amountJpy: 500,
    });
  });
  it('未知 type は InvalidAmountError', () => {
    expect(() => parseCheckoutBody({ type: 'foo' })).toThrow(InvalidAmountError);
  });
});

describe('buildCheckoutParams', () => {
  it('UT-BL-CS01: ai_credits → ¥100×qty / 20回付与名 / metadata', () => {
    const p = buildCheckoutParams({ type: 'ai_credits', quantity: 2 }, 'u1');
    expect(p.mode).toBe('payment');
    expect(p.line_items[0]?.price_data.unit_amount).toBe(200);
    expect(p.line_items[0]?.price_data.currency).toBe('jpy');
    expect(p.metadata).toMatchObject({ userId: 'u1', type: 'ai_credits', quantity: '2' });
    expect(p.client_reference_id).toBe('u1');
    expect(p.success_url).toContain('{CHECKOUT_SESSION_ID}');
  });

  it('UT-BL-CS03: 数量範囲外 (0/11/小数) は InvalidAmountError', () => {
    expect(() => buildCheckoutParams({ type: 'ai_credits', quantity: 0 }, 'u1')).toThrow(InvalidAmountError);
    expect(() => buildCheckoutParams({ type: 'ai_credits', quantity: 11 }, 'u1')).toThrow(InvalidAmountError);
    expect(() => buildCheckoutParams({ type: 'ai_credits', quantity: 1.5 }, 'u1')).toThrow(InvalidAmountError);
  });

  it('UT-BL-CS04: pdf_unlock custom amount → unit_amount = PWYW 金額', () => {
    const p = buildCheckoutParams({ type: 'pdf_unlock', amountJpy: 800 }, 'u1');
    expect(p.line_items[0]?.price_data.unit_amount).toBe(800);
    expect(p.metadata).toMatchObject({ userId: 'u1', type: 'pdf_unlock' });
  });

  it('UT-BL-CS05: PWYW 範囲外 (¥99/¥10001) は InvalidAmountError', () => {
    expect(() => buildCheckoutParams({ type: 'pdf_unlock', amountJpy: 99 }, 'u1')).toThrow(InvalidAmountError);
    expect(() => buildCheckoutParams({ type: 'pdf_unlock', amountJpy: 10001 }, 'u1')).toThrow(InvalidAmountError);
  });
});

describe('runCreateCheckout', () => {
  it('UT-BL-CS06: 匿名 user (isLinked=false) は LinkRequiredError、Stripe 未呼出', async () => {
    const create = vi.fn();
    await expect(
      runCreateCheckout('u1', false, { type: 'ai_credits', quantity: 1 }, { create }),
    ).rejects.toBeInstanceOf(LinkRequiredError);
    expect(create).not.toHaveBeenCalled();
  });

  it('正常: Checkout 作成 → url + sessionId を返す', async () => {
    const create = vi.fn(okCreate);
    const out = await runCreateCheckout('u1', true, { type: 'ai_credits', quantity: 1 }, { create });
    expect(out).toEqual({ url: 'https://checkout.stripe.com/c/cs_1', sessionId: 'cs_1' });
    expect(create).toHaveBeenCalledOnce();
  });

  it('UT-BL-CS07: Stripe API err は伝播 (handler が 500 にマップ)', async () => {
    const create = vi.fn(async () => {
      throw new Error('stripe down');
    }) as unknown as CheckoutInput extends never ? never : typeof okCreate;
    await expect(
      runCreateCheckout('u1', true, { type: 'pdf_unlock', amountJpy: 500 }, { create }),
    ).rejects.toThrow('stripe down');
  });

  it('url が null なら throw (リダイレクト不能)', async () => {
    const create = vi.fn(async () => ({ id: 'cs_2', url: null }));
    await expect(
      runCreateCheckout('u1', true, { type: 'ai_credits', quantity: 1 }, { create }),
    ).rejects.toThrow(/redirect URL/);
  });
});

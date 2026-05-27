/**
 * create-checkout-session 単体テスト (Checkout 発行オーケストレーション + 価格/数量検証)
 * 由来: docs/billing/003_billing_UNIT_TEST.md §1.1 (UT-BL-CS01〜CS07)
 */
import { describe, it, expect, vi } from 'vitest';
import {
  parseCheckoutBody,
  buildCheckoutParams,
  runCreateCheckout,
  baseUrlFromRequest,
  type CheckoutInput,
} from './create-checkout-session';
import { InvalidAmountError } from '../../../src/features/billing/errors';

describe('baseUrlFromRequest (deploy 時 localhost に飛ばない / リクエスト由来)', () => {
  it('Origin ヘッダがあればそれを base にする (デプロイ URL で正しく戻る)', () => {
    const req = new Request('https://x/api/billing/create-checkout-session', {
      method: 'POST',
      headers: { origin: 'https://hana-memo-abc.vercel.app' },
    });
    expect(baseUrlFromRequest(req)).toBe('https://hana-memo-abc.vercel.app');
  });
  it('Origin なし → x-forwarded-proto/host から組み立てる', () => {
    const req = new Request('https://x/api/billing/create-checkout-session', {
      method: 'POST',
      headers: { 'x-forwarded-proto': 'https', 'x-forwarded-host': 'hana-memo.example.com' },
    });
    expect(baseUrlFromRequest(req)).toBe('https://hana-memo.example.com');
  });
  it('success_url がリクエスト origin 基準になる', () => {
    const p = buildCheckoutParams(
      { type: 'ai_credits', quantity: 1 },
      'u1',
      'https://deployed.app',
    );
    expect(p.success_url).toBe(
      'https://deployed.app/billing/success?session_id={CHECKOUT_SESSION_ID}',
    );
  });
});

const okCreate = vi.fn(async () => ({ id: 'cs_1', url: 'https://checkout.stripe.com/c/cs_1' }));

describe('parseCheckoutBody', () => {
  it('ai_credits を正規化', () => {
    expect(parseCheckoutBody({ type: 'ai_credits', quantity: 3 })).toEqual({
      type: 'ai_credits',
      quantity: 3,
    });
  });
  it('pdf_unlock は InvalidAmountError (撤去済み)', () => {
    expect(() => parseCheckoutBody({ type: 'pdf_unlock', amountJpy: 500 })).toThrow(
      InvalidAmountError,
    );
  });
  it('未知 type は InvalidAmountError', () => {
    expect(() => parseCheckoutBody({ type: 'foo' })).toThrow(InvalidAmountError);
  });
});

describe('buildCheckoutParams', () => {
  it('UT-BL-CS01: ai_credits → ¥100 / 10回付与名 / metadata (revise_001)', () => {
    const p = buildCheckoutParams({ type: 'ai_credits', quantity: 1 }, 'u1');
    expect(p.mode).toBe('payment');
    expect(p.line_items[0]?.price_data.unit_amount).toBe(100);
    expect(p.line_items[0]?.price_data.currency).toBe('jpy');
    expect(p.metadata).toMatchObject({ userId: 'u1', type: 'ai_credits', quantity: '1' });
    expect(p.client_reference_id).toBe('u1');
    expect(p.success_url).toContain('{CHECKOUT_SESSION_ID}');
  });

  it('UT-BL-CS03: 数量範囲外 (0/11/小数) は InvalidAmountError', () => {
    expect(() => buildCheckoutParams({ type: 'ai_credits', quantity: 0 }, 'u1')).toThrow(
      InvalidAmountError,
    );
    expect(() => buildCheckoutParams({ type: 'ai_credits', quantity: 11 }, 'u1')).toThrow(
      InvalidAmountError,
    );
    expect(() => buildCheckoutParams({ type: 'ai_credits', quantity: 1.5 }, 'u1')).toThrow(
      InvalidAmountError,
    );
  });
});

describe('runCreateCheckout', () => {
  it('revise_001: 匿名(ゲスト)のまま Checkout 発行可 (requireLinked 撤廃)', async () => {
    const create = vi.fn(okCreate);
    const out = await runCreateCheckout('u1', { type: 'ai_credits', quantity: 1 }, { create });
    expect(out).toEqual({ url: 'https://checkout.stripe.com/c/cs_1', sessionId: 'cs_1' });
    expect(create).toHaveBeenCalledOnce();
  });

  it('正常: Checkout 作成 → url + sessionId を返す', async () => {
    const create = vi.fn(okCreate);
    const out = await runCreateCheckout('u1', { type: 'ai_credits', quantity: 1 }, { create });
    expect(out).toEqual({ url: 'https://checkout.stripe.com/c/cs_1', sessionId: 'cs_1' });
    expect(create).toHaveBeenCalledOnce();
  });

  it('UT-BL-CS07: Stripe API err は伝播 (handler が 500 にマップ)', async () => {
    const create = vi.fn(async () => {
      throw new Error('stripe down');
    }) as unknown as CheckoutInput extends never ? never : typeof okCreate;
    await expect(
      runCreateCheckout('u1', { type: 'ai_credits', quantity: 1 }, { create }),
    ).rejects.toThrow('stripe down');
  });

  it('url が null なら throw (リダイレクト不能)', async () => {
    const create = vi.fn(async () => ({ id: 'cs_2', url: null }));
    await expect(
      runCreateCheckout('u1', { type: 'ai_credits', quantity: 1 }, { create }),
    ).rejects.toThrow(/redirect URL/);
  });
});

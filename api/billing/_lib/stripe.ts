/**
 * Stripe SDK ラッパ (Vercel Function 専用)
 *
 * Checkout Session 作成と Webhook 署名検証を提供する。SDK 依存はこのファイルに隔離し、
 * `CreateCheckoutFn` / `VerifyStripeSignatureFn` を注入して上位 handler の unit test を
 * SDK 非依存に保つ。ネットワーク再試行は SDK の `maxNetworkRetries` に委譲 (UT-BL-CS07)。
 *
 * 関連: docs/billing/001_billing_SPEC.md §1 UC1/UC2/§4, 002_billing_PLAN.md Phase 1/2
 */
import Stripe from 'stripe';
import type { StripeCheckoutEvent } from '../../../src/features/billing/webhook';

/** Stripe Checkout Session 作成パラメータ (line_items は price_data で都度生成)。 */
export type CheckoutSessionParams = {
  mode: 'payment';
  line_items: Array<{
    price_data: {
      currency: 'jpy';
      product_data: { name: string };
      unit_amount: number;
    };
    quantity: number;
  }>;
  metadata: Record<string, string>;
  client_reference_id: string;
  success_url: string;
  cancel_url: string;
};

/** 作成された Checkout Session の最小形 (id + redirect URL)。 */
export type CheckoutSession = { id: string; url: string | null };

/** Checkout Session 作成関数 (テスト注入用)。 */
export type CreateCheckoutFn = (params: CheckoutSessionParams) => Promise<CheckoutSession>;

/** raw body + 署名から検証済 event を返す (失敗時 throw、テスト注入用)。 */
export type VerifyStripeSignatureFn = (rawBody: string, signature: string) => StripeCheckoutEvent;

/** 実 Stripe client から CreateCheckoutFn を生成する (api key は env、retry 1)。 */
export function createStripeCheckoutFn(deps: { apiKey?: string } = {}): CreateCheckoutFn {
  const apiKey = deps.apiKey ?? process.env.STRIPE_SECRET_KEY;
  if (!apiKey) {
    throw new Error('STRIPE_SECRET_KEY is not set');
  }
  const client = new Stripe(apiKey, { maxNetworkRetries: 1 });
  return async (params) => {
    const session = await client.checkout.sessions.create(
      params as unknown as Stripe.Checkout.SessionCreateParams,
    );
    return { id: session.id, url: session.url };
  };
}

/** 実 Stripe client から Webhook 署名検証関数を生成する (secret は env)。 */
export function createStripeWebhookVerifier(
  deps: { apiKey?: string; secret?: string } = {},
): VerifyStripeSignatureFn {
  const apiKey = deps.apiKey ?? process.env.STRIPE_SECRET_KEY;
  const secret = deps.secret ?? process.env.STRIPE_WEBHOOK_SECRET;
  if (!apiKey) {
    throw new Error('STRIPE_SECRET_KEY is not set');
  }
  if (!secret) {
    throw new Error('STRIPE_WEBHOOK_SECRET is not set');
  }
  const client = new Stripe(apiKey, { maxNetworkRetries: 1 });
  return (rawBody, signature) =>
    client.webhooks.constructEvent(rawBody, signature, secret) as unknown as StripeCheckoutEvent;
}

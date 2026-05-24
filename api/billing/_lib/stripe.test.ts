/**
 * stripe.ts 単体テスト (SDK factory の env fail-closed ガード)
 * 由来: docs/billing/002_billing_PLAN.md Phase 1/2 (secret 未設定は fail-closed)
 */
import { describe, it, expect } from 'vitest';
import { createStripeCheckoutFn, createStripeWebhookVerifier } from './stripe';

describe('createStripeCheckoutFn', () => {
  it('STRIPE_SECRET_KEY 未設定は throw (fail-closed)', () => {
    expect(() => createStripeCheckoutFn({ apiKey: undefined })).toThrow(/STRIPE_SECRET_KEY/);
  });
  it('apiKey 指定で CreateCheckoutFn を返す (SDK 遅延・network なし)', () => {
    const fn = createStripeCheckoutFn({ apiKey: 'sk_test_dummy' });
    expect(typeof fn).toBe('function');
  });
});

describe('createStripeWebhookVerifier', () => {
  it('STRIPE_SECRET_KEY 未設定は throw', () => {
    expect(() => createStripeWebhookVerifier({ apiKey: undefined, secret: 'whsec_x' })).toThrow(
      /STRIPE_SECRET_KEY/,
    );
  });
  it('STRIPE_WEBHOOK_SECRET 未設定は throw', () => {
    expect(() => createStripeWebhookVerifier({ apiKey: 'sk_test_dummy', secret: undefined })).toThrow(
      /STRIPE_WEBHOOK_SECRET/,
    );
  });
  it('両方指定で VerifyStripeSignatureFn を返す', () => {
    const fn = createStripeWebhookVerifier({ apiKey: 'sk_test_dummy', secret: 'whsec_dummy' });
    expect(typeof fn).toBe('function');
  });
});

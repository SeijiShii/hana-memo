/**
 * Stripe Webhook 受信エンドポイント (POST /api/billing/stripe-webhook)
 *
 * Stripe-Signature を constructEvent で検証 → `applyBillingWebhook` (純粋コア、DI) で
 * billing_unlocks INSERT + users 更新を idempotent に適用する。べき等性は webhook_dedupe
 * (event.id UNIQUE) + billing_unlocks (session_id UNIQUE) で確保 ([SEC-006] / UT-BL-WH03)。
 * Stripe SDK / db は env 依存のため handler 内で遅延 import する。
 *
 * 関連: docs/billing/001_billing_SPEC.md §1 UC1/UC2/§4.2, 002_billing_PLAN.md Phase 1 (UT-BL-WH01〜WH07)
 */
import {
  applyBillingWebhook,
  type BillingStore,
  type StripeCheckoutEvent,
} from '../../src/features/billing/webhook';
import type { VerifyStripeSignatureFn } from './_lib/stripe';

/** webhook 処理結果 (HTTP ステータスへマップ)。 */
export type WebhookResult = {
  status: number;
  body: { ok: boolean; applied?: boolean; reason?: string };
};

/**
 * 検証 → 適用を行う (テスト可能、stripe/db は注入)。
 * - 署名不一致 → 401 (UT-BL-WH04、Stripe は retry しない)
 * - 適用失敗 (DB err 等) → 500 (UT-BL-WH07、Stripe が retry)
 * - 成功 / 重複 / ignore → 200
 */
export async function processStripeWebhook(
  rawBody: string,
  signature: string,
  deps: { verify: VerifyStripeSignatureFn; store: BillingStore },
): Promise<WebhookResult> {
  let event: StripeCheckoutEvent;
  try {
    event = deps.verify(rawBody, signature);
  } catch {
    return { status: 401, body: { ok: false, reason: 'invalid signature' } };
  }
  try {
    const result = await applyBillingWebhook(deps.store, event);
    return { status: 200, body: { ok: true, applied: result.applied, reason: result.reason } };
  } catch (err) {
    console.error('stripe-webhook apply failed', err);
    return { status: 500, body: { ok: false, reason: 'apply failed' } };
  }
}

/** drizzle 実体で BillingStore を構築する (env 依存の db を遅延 import)。 */
async function createDrizzleStore(): Promise<BillingStore> {
  const [{ db }, { users, billingUnlocks, webhookDedupe }, { eq, sql }] = await Promise.all([
    import('../../src/shared/db/client'),
    import('../../src/shared/db/schema'),
    import('drizzle-orm'),
  ]);
  return {
    async isEventProcessed(eventId) {
      const rows = await db
        .select({ id: webhookDedupe.id })
        .from(webhookDedupe)
        .where(eq(webhookDedupe.id, eventId))
        .limit(1);
      return rows.length > 0;
    },
    async recordEvent(eventId, source) {
      await db.insert(webhookDedupe).values({ id: eventId, source }).onConflictDoNothing();
    },
    async insertUnlock(record) {
      await db.insert(billingUnlocks).values({
        userId: record.userId,
        type: record.type,
        amountJpy: record.amountJpy,
        stripeCheckoutSessionId: record.sessionId,
        stripePaymentIntentId: record.paymentIntent,
      });
    },
    async grantCredits(userId, credits) {
      await db
        .update(users)
        .set({ aiCreditsRemaining: sql`${users.aiCreditsRemaining} + ${credits}` })
        .where(eq(users.id, userId));
    },
  };
}

export const config = { runtime: 'nodejs' };

/** Vercel Web handler。 */
async function handler(req: Request): Promise<Response> {
  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 });
  }
  const signature = req.headers.get('stripe-signature') ?? '';
  const rawBody = await req.text();

  let verify: VerifyStripeSignatureFn;
  try {
    const { createStripeWebhookVerifier } = await import('./_lib/stripe');
    verify = createStripeWebhookVerifier();
  } catch {
    return new Response('server misconfigured', { status: 500 });
  }

  const store = await createDrizzleStore();
  const result = await processStripeWebhook(rawBody, signature, { verify, store });
  return new Response(JSON.stringify(result.body), {
    status: result.status,
    headers: { 'content-type': 'application/json' },
  });
}

export default { fetch: handler };

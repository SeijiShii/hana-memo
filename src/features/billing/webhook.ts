/**
 * Stripe Webhook → billing_unlocks 反映 (べき等性、[SEC-006])
 *
 * 署名検証は Vercel Function (defer)。本モジュールは検証済 event を受け取り、
 * event→操作の純粋 mapping + BillingStore (DI) への idempotent な適用を担う。
 *
 * 関連: docs/billing/001_billing_SPEC.md §1 UC1/UC2, §4.2 (E-BL-003), 003_billing_UNIT_TEST.md §1.2
 */
import { aiCreditsGranted } from './pricing';

export type StripeCheckoutEvent = {
  id: string; // event.id (webhook_dedupe 用)
  type: string; // 'checkout.session.completed' 等
  data: {
    object: {
      id: string; // checkout session id (billing_unlocks UNIQUE)
      payment_intent?: string | null;
      amount_total?: number | null;
      metadata?: Record<string, string> | null;
    };
  };
};

export type BillingUnlockOp =
  | {
      op: 'grantCredits';
      userId: string;
      sessionId: string;
      paymentIntent: string | null;
      amountJpy: number;
      credits: number;
    }
  | {
      op: 'unlockPdf';
      userId: string;
      sessionId: string;
      paymentIntent: string | null;
      amountJpy: number;
    }
  | { op: 'ignore'; reason: string };

/** Stripe event を billing 操作に変換する (純関数)。 */
export function mapStripeEvent(event: StripeCheckoutEvent): BillingUnlockOp {
  if (event.type !== 'checkout.session.completed') {
    return { op: 'ignore', reason: `unhandled event type: ${event.type}` };
  }
  const obj = event.data.object;
  const userId = obj.metadata?.userId;
  if (!userId) {
    return { op: 'ignore', reason: 'missing metadata.userId' };
  }
  const sessionId = obj.id;
  const paymentIntent = obj.payment_intent ?? null;
  const amountJpy = obj.amount_total ?? 0;
  const type = obj.metadata?.type;

  if (type === 'ai_credits') {
    const qty = Number(obj.metadata?.quantity ?? '1');
    return {
      op: 'grantCredits',
      userId,
      sessionId,
      paymentIntent,
      amountJpy,
      credits: aiCreditsGranted(Number.isInteger(qty) ? qty : 1),
    };
  }
  if (type === 'pdf_unlock') {
    return { op: 'unlockPdf', userId, sessionId, paymentIntent, amountJpy };
  }
  return { op: 'ignore', reason: `unknown metadata.type: ${type}` };
}

export type BillingUnlockRecord = {
  userId: string;
  type: 'ai_credits' | 'pdf_unlock';
  amountJpy: number;
  sessionId: string;
  paymentIntent: string | null;
};

/** 実 DB 書き込みを抽象化 (実体は Drizzle を api/ 層で注入)。 */
export type BillingStore = {
  /** webhook_dedupe に event.id が記録済みか ([SEC-006]) */
  isEventProcessed(eventId: string): Promise<boolean>;
  recordEvent(eventId: string, source: string): Promise<void>;
  insertUnlock(record: BillingUnlockRecord): Promise<void>;
  grantCredits(userId: string, credits: number): Promise<void>;
  setPdfUnlocked(userId: string): Promise<void>;
};

/**
 * 検証済み Stripe webhook を idempotent に適用する。
 * - event.id 処理済み → applied=false (UT-BL-WH03 べき等性)
 * - ignore → event 記録のみ、applied=false
 * - grantCredits / unlockPdf → unlock INSERT + users 更新 + event 記録
 */
export async function applyBillingWebhook(
  store: BillingStore,
  event: StripeCheckoutEvent,
): Promise<{ applied: boolean; reason?: string }> {
  if (await store.isEventProcessed(event.id)) {
    return { applied: false, reason: 'duplicate event' };
  }
  const op = mapStripeEvent(event);
  if (op.op === 'ignore') {
    await store.recordEvent(event.id, 'stripe');
    return { applied: false, reason: op.reason };
  }

  await store.insertUnlock({
    userId: op.userId,
    type: op.op === 'grantCredits' ? 'ai_credits' : 'pdf_unlock',
    amountJpy: op.amountJpy,
    sessionId: op.sessionId,
    paymentIntent: op.paymentIntent,
  });

  if (op.op === 'grantCredits') {
    await store.grantCredits(op.userId, op.credits);
  } else {
    await store.setPdfUnlocked(op.userId);
  }

  await store.recordEvent(event.id, 'stripe');
  return { applied: true };
}

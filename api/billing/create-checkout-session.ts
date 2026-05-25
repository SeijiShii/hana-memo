/**
 * Stripe Checkout Session 発行エンドポイント (POST /api/billing/create-checkout-session)
 *
 * Clerk JWT 検証 → Neon users.id 解決 → OAuth リンク必須ガード ([E-BL-002]) → 価格/数量検証 →
 * Checkout Session 作成 → redirect URL を返す。Stripe SDK は _lib/stripe.ts に隔離し dynamic import。
 * オーケストレーション `runCreateCheckout` は副作用を deps 注入し SDK/DB 非依存で単体テスト可能。
 *
 * 関連: docs/billing/001_billing_SPEC.md §1 UC1/UC2/§4.1, 002_billing_PLAN.md Phase 1/2 (UT-BL-CS01〜CS07)
 */
import { verifyClerkSession, UnauthorizedError } from '../_lib/clerk';
import { resolveUserId, UserNotFoundError } from '../_lib/user';
import {
  aiCreditsAmountJpy,
  validatePwywAmount,
  requireLinked,
  AI_CREDITS_PER_UNIT,
} from '../../src/features/billing/pricing';
import { InvalidAmountError } from '../../src/features/billing/errors';
import { LinkRequiredError } from '../../src/shared/auth/errors';
import type { CheckoutSessionParams, CreateCheckoutFn } from './_lib/stripe';

/** Checkout 発行のリクエスト入力 (type で分岐)。 */
export type CheckoutInput =
  | { type: 'ai_credits'; quantity: number }
  | { type: 'pdf_unlock'; amountJpy: number };

/** request body を CheckoutInput に検証・正規化する (純関数)。 */
export function parseCheckoutBody(raw: unknown): CheckoutInput {
  const b = (raw ?? {}) as Record<string, unknown>;
  if (b.type === 'ai_credits') {
    return { type: 'ai_credits', quantity: Number(b.quantity ?? Number.NaN) };
  }
  if (b.type === 'pdf_unlock') {
    return { type: 'pdf_unlock', amountJpy: Number(b.amountJpy ?? Number.NaN) };
  }
  throw new InvalidAmountError('type must be ai_credits or pdf_unlock');
}

/** redirect URL を組み立てる。session_id プレースホルダは Stripe が置換する。 */
function checkoutUrls(): { success_url: string; cancel_url: string } {
  const base = (process.env.APP_BASE_URL ?? '').replace(/\/$/, '');
  return {
    success_url: `${base}/billing/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${base}/billing`,
  };
}

/**
 * 価格/数量を検証して Stripe Checkout Session パラメータを構築する (純関数、UT-BL-CS01〜CS05)。
 * ai_credits: ¥100 × qty / 20 回付与。pdf_unlock: PWYW custom amount。
 */
export function buildCheckoutParams(input: CheckoutInput, userId: string): CheckoutSessionParams {
  const urls = checkoutUrls();
  if (input.type === 'ai_credits') {
    const amount = aiCreditsAmountJpy(input.quantity); // validateQuantity 内包 (InvalidAmountError)
    return {
      mode: 'payment',
      line_items: [
        {
          price_data: {
            currency: 'jpy',
            product_data: { name: `AI 同定クレジット ${input.quantity * AI_CREDITS_PER_UNIT} 回分` },
            unit_amount: amount,
          },
          quantity: 1,
        },
      ],
      metadata: { userId, type: 'ai_credits', quantity: String(input.quantity) },
      client_reference_id: userId,
      ...urls,
    };
  }
  const amount = validatePwywAmount(input.amountJpy); // InvalidAmountError
  return {
    mode: 'payment',
    line_items: [
      {
        price_data: {
          currency: 'jpy',
          product_data: { name: '図鑑 PDF 出力アンロック' },
          unit_amount: amount,
        },
        quantity: 1,
      },
    ],
    metadata: { userId, type: 'pdf_unlock' },
    client_reference_id: userId,
    ...urls,
  };
}

export type CreateCheckoutDeps = {
  create: CreateCheckoutFn;
};

/** Checkout 発行のオーケストレーション (副作用は deps 注入)。 */
export async function runCreateCheckout(
  userId: string,
  isLinked: boolean,
  input: CheckoutInput,
  deps: CreateCheckoutDeps,
): Promise<{ url: string; sessionId: string }> {
  requireLinked(isLinked); // LinkRequiredError (E-BL-002)
  const params = buildCheckoutParams(input, userId);
  const session = await deps.create(params);
  if (!session.url) {
    throw new Error('Stripe Checkout Session has no redirect URL');
  }
  return { url: session.url, sessionId: session.id };
}

function jsonResponse(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

/** runCreateCheckout / 認証で throw した例外を HTTP ステータスにマップする。 */
function mapError(err: unknown): Response {
  if (err instanceof LinkRequiredError) {
    return jsonResponse({ error: 'link_required' }, 401); // 匿名 user は購入不可
  }
  if (err instanceof InvalidAmountError) {
    return jsonResponse({ error: 'invalid_amount' }, 400);
  }
  if (err instanceof UserNotFoundError) {
    return jsonResponse({ error: 'user_not_found' }, err.status);
  }
  return jsonResponse({ error: 'checkout_failed' }, 500); // Stripe 失敗 (UT-BL-CS07)
}

/** Neon users から OAuth リンク済か (= 非匿名) を判定する。 */
async function fetchIsLinked(userId: string): Promise<boolean> {
  const [{ db }, { users }, { eq }] = await Promise.all([
    import('../../src/shared/db/client'),
    import('../../src/shared/db/schema'),
    import('drizzle-orm'),
  ]);
  const rows = await db
    .select({ isAnonymous: users.isAnonymous })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  return rows[0] ? !rows[0].isAnonymous : false;
}

export const config = { runtime: 'nodejs' };

/** Vercel Web handler。 */
async function handler(req: Request): Promise<Response> {
  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 });
  }

  let clerkUserId: string;
  try {
    ({ clerkUserId } = await verifyClerkSession(req));
  } catch (err) {
    return jsonResponse({ error: 'unauthorized' }, err instanceof UnauthorizedError ? err.status : 500);
  }

  let input: CheckoutInput;
  try {
    input = parseCheckoutBody(await req.json().catch(() => ({})));
  } catch {
    return jsonResponse({ error: 'bad_request' }, 400);
  }

  try {
    const userId = await resolveUserId(clerkUserId);
    const isLinked = await fetchIsLinked(userId);
    const { createStripeCheckoutFn } = await import('./_lib/stripe');
    const result = await runCreateCheckout(userId, isLinked, input, {
      create: createStripeCheckoutFn(),
    });
    return jsonResponse(result, 200);
  } catch (err) {
    return mapError(err);
  }
}

export default { fetch: handler };

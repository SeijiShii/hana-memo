/**
 * 決済確定 poll エンドポイント (GET /api/billing/confirm?session_id=...)
 *
 * Clerk JWT 検証 → Neon users.id 解決 → 当該 user の billing_unlocks に checkout session が
 * 記録済みか ([SEC-005] user_id スコープ強制) を返す。Webhook 反映の遅延を frontend が poll する。
 *
 * 関連: docs/billing/001_billing_SPEC.md §1 UC1, 002_billing_PLAN.md Phase 1 (UT-BL-SC01〜SC03)
 */
import { verifyClerkSession, UnauthorizedError } from '../_lib/clerk';
import { resolveUserId, UserNotFoundError } from '../_lib/user';

export type ConfirmResult =
  | { found: false }
  | { found: true; type: 'ai_credits' | 'pdf_unlock'; aiCreditsRemaining: number; pdfUnlocked: boolean };

function jsonResponse(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

async function lookupUnlock(userId: string, sessionId: string): Promise<ConfirmResult> {
  const [{ db }, { users, billingUnlocks }, { eq, and }] = await Promise.all([
    import('../../src/shared/db/client'),
    import('../../src/shared/db/schema'),
    import('drizzle-orm'),
  ]);
  const unlocks = await db
    .select({ type: billingUnlocks.type })
    .from(billingUnlocks)
    .where(
      and(
        eq(billingUnlocks.stripeCheckoutSessionId, sessionId),
        eq(billingUnlocks.userId, userId), // [SEC-005] 自分の決済のみ
      ),
    )
    .limit(1);
  const unlock = unlocks[0];
  if (!unlock) {
    return { found: false };
  }
  const rows = await db
    .select({ aiCreditsRemaining: users.aiCreditsRemaining, pdfUnlocked: users.pdfUnlocked })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  const row = rows[0];
  return {
    found: true,
    type: unlock.type,
    aiCreditsRemaining: row?.aiCreditsRemaining ?? 0,
    pdfUnlocked: row?.pdfUnlocked ?? false,
  };
}

export const config = { runtime: 'nodejs' };

/** Vercel Web handler。 */
export default async function handler(req: Request): Promise<Response> {
  if (req.method !== 'GET') {
    return new Response('Method Not Allowed', { status: 405 });
  }
  const sessionId = new URL(req.url).searchParams.get('session_id') ?? '';
  if (!sessionId) {
    return jsonResponse({ error: 'bad_request' }, 400);
  }
  let clerkUserId: string;
  try {
    ({ clerkUserId } = await verifyClerkSession(req));
  } catch (err) {
    return jsonResponse({ error: 'unauthorized' }, err instanceof UnauthorizedError ? err.status : 500);
  }
  try {
    const userId = await resolveUserId(clerkUserId);
    return jsonResponse(await lookupUnlock(userId, sessionId), 200);
  } catch (err) {
    if (err instanceof UserNotFoundError) {
      return jsonResponse({ error: 'user_not_found' }, err.status);
    }
    return jsonResponse({ error: 'internal' }, 500);
  }
}

/**
 * 課金ステータス取得エンドポイント (GET /api/billing/status)
 *
 * Clerk JWT 検証 → Neon users.id 解決 → ai_credits_remaining を返す。
 * frontend の useAiCredits が mount 時 + refresh 時に叩く。
 *
 * 関連: docs/billing/001_billing_SPEC.md §1 UC3, 002_billing_PLAN.md Phase 3 (UT-BL-H01〜H03)
 */
import { verifyClerkSession, UnauthorizedError } from '../_lib/clerk';
import { resolveUserId, UserNotFoundError } from '../_lib/user';
import { fetchEffectiveQuota } from '../_lib/quota';

export type BillingStatus = {
  aiCreditsRemaining: number;
  /** identify に使える実効残数 (匿名 trial / 登録 月次無料+credits)。フロント quota ゲート用 (fix_001)。 */
  quotaRemaining: number;
  /** 匿名で無料枠を使い切った = Google リンク誘導。 */
  mustLink: boolean;
};

function jsonResponse(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

async function fetchStatus(userId: string): Promise<BillingStatus> {
  const [{ db }, { users }, { eq }] = await Promise.all([
    import('../../src/shared/db/client'),
    import('../../src/shared/db/schema'),
    import('drizzle-orm'),
  ]);
  const rows = await db
    .select({ aiCreditsRemaining: users.aiCreditsRemaining })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  const row = rows[0];
  const quota = await fetchEffectiveQuota(userId);
  return {
    aiCreditsRemaining: row?.aiCreditsRemaining ?? 0,
    quotaRemaining: quota.remaining,
    mustLink: quota.mustLink,
  };
}

export const config = { runtime: 'nodejs' };

/** Vercel Web handler。 */
async function handler(req: Request): Promise<Response> {
  if (req.method !== 'GET') {
    return new Response('Method Not Allowed', { status: 405 });
  }
  let clerkUserId: string;
  try {
    ({ clerkUserId } = await verifyClerkSession(req));
  } catch (err) {
    return jsonResponse(
      { error: 'unauthorized' },
      err instanceof UnauthorizedError ? err.status : 500,
    );
  }
  try {
    const userId = await resolveUserId(clerkUserId);
    return jsonResponse(await fetchStatus(userId), 200);
  } catch (err) {
    if (err instanceof UserNotFoundError) {
      return jsonResponse({ error: 'user_not_found' }, err.status);
    }
    return jsonResponse({ error: 'internal' }, 500);
  }
}

export default { fetch: handler };

/**
 * SPAM 抑止判定エンドポイント (trial 上限 + fingerprint hard cap)
 *
 * Clerk session を検証 → Neon users から isAnonymous / trial_used_count を取得 →
 * `checkTrialQuota` (純関数) で quota を算出し、同一 fingerprint の匿名アカウント乱立を
 * hard cap で抑止する。判定本体 `evaluateSpamCheck` は SDK/DB 非依存で単体テスト可能。
 *
 * 関連: docs/_shared/auth/001_auth_SPEC.md §1.2 / §4, 003_auth_UNIT_TEST.md §1.3 (UT-AU-G03〜G08)
 */
import { verifyClerkSession, UnauthorizedError } from '../_lib/clerk';
import { checkTrialQuota, type TrialQuota } from '../../src/shared/auth/trial';

/** 同一 fingerprint で許容する匿名アカウント上限 (UT-AU-G08)。 */
export const FINGERPRINT_HARD_CAP = 100;

/**
 * trial quota + fingerprint hard cap を評価する (純関数)。
 * - OAuth user (isAnonymous=false) は無制限、cap 対象外
 * - 匿名 user は ANON_TRIAL_MAX 超過 or 同 fingerprint が cap 到達で mustLink
 */
export function evaluateSpamCheck(input: {
  user: { isAnonymous: boolean; trialUsedCount: number } | null;
  fingerprintUserCount: number;
  fingerprintHardCap?: number;
}): TrialQuota {
  const isAnonymous = input.user?.isAnonymous ?? true;
  const trialUsedCount = input.user?.trialUsedCount ?? 0;
  const quota = checkTrialQuota({ isAnonymous, trialUsedCount });
  const cap = input.fingerprintHardCap ?? FINGERPRINT_HARD_CAP;
  if (isAnonymous && input.fingerprintUserCount >= cap) {
    return { ...quota, remaining: 0, mustLink: true };
  }
  return quota;
}

/**
 * fingerprint で関連付く匿名アカウント数を数える。
 * NOTE: fingerprint の永続化テーブルは未導入 ([論点-006] follow-up) のため現状は 0 を返すスタブ。
 * スキーマ追加後にここを実 COUNT に差し替える。
 */
async function countUsersByFingerprint(_fingerprint: string): Promise<number> {
  return 0;
}

function jsonResponse(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
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
    const status = err instanceof UnauthorizedError ? err.status : 500;
    return jsonResponse({ error: 'unauthorized' }, status);
  }

  const body = (await req.json().catch(() => ({}))) as { fingerprint?: string };
  const fingerprint = body.fingerprint ?? '';

  const [{ db }, { users }, { eq }] = await Promise.all([
    import('../../src/shared/db/client'),
    import('../../src/shared/db/schema'),
    import('drizzle-orm'),
  ]);

  const rows = await db
    .select({ isAnonymous: users.isAnonymous, trialUsedCount: users.trialUsedCount })
    .from(users)
    .where(eq(users.clerkUserId, clerkUserId))
    .limit(1);

  const user = rows[0] ?? null;
  const fingerprintUserCount = fingerprint ? await countUsersByFingerprint(fingerprint) : 0;
  const quota = evaluateSpamCheck({ user, fingerprintUserCount });
  return jsonResponse(quota, 200);
}

export default { fetch: handler };

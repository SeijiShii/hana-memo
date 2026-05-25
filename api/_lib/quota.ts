/**
 * 実効 quota を DB から算出する共有ヘルパ (fix_001)。
 *
 * identify-plant (enforcement) と billing/status (フロント表示) の両方がこれを使い、
 * 「匿名=trial / 登録=当月 identify 件数 + 購入クレジット」の算出ロジックを単一化する
 * (claim_001 の根因 = trial と identify quota の二重・乖離を再発させない)。
 *
 * 純判定は src/shared/ai/quota.ts の effectiveQuota、本ファイルは DB 読みのみを担う。
 */
import { effectiveQuota, type EffectiveQuota } from '../../src/shared/ai/quota';

/** 当月 (UTC) の開始時刻。月次無料枠カウントの境界。 */
export function startOfMonthUtc(now: Date = new Date()): Date {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
}

/** users 行 + 登録ユーザーの当月 identify 件数 を読み、実効 quota を返す。 */
export async function fetchEffectiveQuota(userId: string, now: Date = new Date()): Promise<EffectiveQuota> {
  const [{ db }, { users, apiUsage }, { eq, and, gte, sql }] = await Promise.all([
    import('../../src/shared/db/client'),
    import('../../src/shared/db/schema'),
    import('drizzle-orm'),
  ]);
  const rows = await db
    .select({
      isAnonymous: users.isAnonymous,
      trialUsedCount: users.trialUsedCount,
      aiCreditsRemaining: users.aiCreditsRemaining,
    })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  const u = rows[0] ?? { isAnonymous: true, trialUsedCount: 0, aiCreditsRemaining: 0 };

  let monthlyUsedCount = 0;
  if (!u.isAnonymous) {
    const cnt = await db
      .select({ n: sql<number>`count(*)::int` })
      .from(apiUsage)
      .where(
        and(
          eq(apiUsage.userId, userId),
          eq(apiUsage.endpoint, 'identify-plant'),
          eq(apiUsage.success, true),
          gte(apiUsage.createdAt, startOfMonthUtc(now)),
        ),
      );
    monthlyUsedCount = Number(cnt[0]?.n ?? 0);
  }

  return effectiveQuota({
    isAnonymous: u.isAnonymous,
    trialUsedCount: u.trialUsedCount,
    monthlyUsedCount,
    aiCreditsRemaining: u.aiCreditsRemaining,
  });
}

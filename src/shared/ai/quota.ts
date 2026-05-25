/**
 * AI quota 判定 (純関数)
 * 関連: docs/_shared/ai/001_ai_SPEC.md §4.1, 003_ai_UNIT_TEST.md §1.6 (UT-AI-Q01〜Q04)
 */
import { QuotaExceededError } from './errors';
import { ANON_TRIAL_MAX } from '../auth/trial';

/** quota 残を判定する。 */
export function checkQuota(remaining: number): { ok: boolean; remaining: number } {
  return { ok: remaining > 0, remaining: Math.max(0, remaining) };
}

/** quota を 1 消費した後の残数を返す。残 0 で QuotaExceededError。 */
export function consumeQuota(remaining: number): number {
  if (remaining <= 0) {
    throw new QuotaExceededError();
  }
  return remaining - 1;
}

/**
 * 実効 quota モデル (fix_001、claim_001 由来)。確定方針:
 * - 匿名ユーザー: ANON_TRIAL_MAX(3) 回 生涯無料 (trial_used_count)。使い切ったら Google リンク要求 (mustLink)。
 * - リンク済(登録)ユーザー: 月 MONTHLY_FREE_LIMIT(10) 回無料 (当月 identify 件数) + 購入 ai_credits_remaining。
 * これにより SPEC §4「quota 残あり (ai_credits_remaining or trial)」を identify 経路に正しく配線する。
 * 匿名上限 ANON_TRIAL_MAX は auth/trial.ts を単一の真実源として再利用する (二重定義の drift 回避)。
 */
export const MONTHLY_FREE_LIMIT = 10;

/** 今回の同定で「どのカウンタを消費するか」。monthly = 月次無料枠内 (api_usage 行のみが実体、専用カウンタ無し)。 */
export type QuotaConsumeSource = 'trial' | 'monthly' | 'credits' | 'none';

export type EffectiveQuota = {
  /** いま同定に使える総残数。 */
  remaining: number;
  /** 匿名で無料枠を使い切った = Google リンク要求 (401 link_required)。 */
  mustLink: boolean;
  /** 今回 1 回消費する際に更新すべきカウンタ。remaining<=0 のときは 'none'。 */
  consume: QuotaConsumeSource;
};

export type EffectiveQuotaInput = {
  isAnonymous: boolean;
  /** 匿名の生涯試行回数 (users.trial_used_count)。 */
  trialUsedCount: number;
  /** 登録ユーザーの当月成功 identify 件数 (api_usage 由来)。 */
  monthlyUsedCount: number;
  /** 購入済みクレジット (users.ai_credits_remaining)。 */
  aiCreditsRemaining: number;
};

/**
 * 実効 quota を算出する (純関数)。匿名は trial、登録は月次無料 + 購入クレジット。
 * 消費順序: 登録ユーザーは月次無料枠を先に使い、尽きたら購入クレジット。
 */
export function effectiveQuota(
  input: EffectiveQuotaInput,
  opts: { anonMax?: number; monthlyMax?: number } = {},
): EffectiveQuota {
  const anonMax = opts.anonMax ?? ANON_TRIAL_MAX;
  const monthlyMax = opts.monthlyMax ?? MONTHLY_FREE_LIMIT;

  if (input.isAnonymous) {
    const remaining = Math.max(0, anonMax - input.trialUsedCount);
    return {
      remaining,
      mustLink: remaining <= 0,
      consume: remaining > 0 ? 'trial' : 'none',
    };
  }

  const monthlyRemaining = Math.max(0, monthlyMax - input.monthlyUsedCount);
  const credits = Math.max(0, input.aiCreditsRemaining);
  const remaining = monthlyRemaining + credits;
  let consume: QuotaConsumeSource = 'none';
  if (monthlyRemaining > 0) consume = 'monthly';
  else if (credits > 0) consume = 'credits';
  return { remaining, mustLink: false, consume };
}

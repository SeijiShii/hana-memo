/**
 * trial クォータ判定 (SPAM 抑止、[論点-006])
 *
 * 匿名 user は AI 同定 ANON_TRIAL_MAX 回まで。超過で OAuth リンクを要求。
 * OAuth user は無制限。純関数 + 例外で表現し、fetch / DB は呼び出し側 (spam-guard / Vercel Function)。
 *
 * 関連: docs/_shared/auth/001_auth_SPEC.md §1.3, 003_auth_UNIT_TEST.md §1.3 (UT-AU-G03〜G07)
 */
import { LinkRequiredError } from './errors';

/** 匿名 user の AI 同定 trial 上限 (concept §6 / [論点-006]) */
export const ANON_TRIAL_MAX = 3;

export type TrialQuota = {
  used: number;
  /** 匿名は max=ANON_TRIAL_MAX、OAuth user は Infinity */
  max: number;
  remaining: number;
  /** true = trial 超過、OAuth リンク必須 */
  mustLink: boolean;
};

/** trial 利用状況を判定する (純関数)。 */
export function checkTrialQuota(input: {
  isAnonymous: boolean;
  trialUsedCount: number;
  max?: number;
}): TrialQuota {
  if (!input.isAnonymous) {
    return {
      used: input.trialUsedCount,
      max: Number.POSITIVE_INFINITY,
      remaining: Number.POSITIVE_INFINITY,
      mustLink: false,
    };
  }
  const max = input.max ?? ANON_TRIAL_MAX;
  const remaining = Math.max(0, max - input.trialUsedCount);
  return {
    used: input.trialUsedCount,
    max,
    remaining,
    mustLink: input.trialUsedCount >= max,
  };
}

/** trial 超過なら LinkRequiredError を throw、範囲内なら何もしない (E-AU-004)。 */
export function enforceTrialLimit(quota: TrialQuota): void {
  if (quota.mustLink) {
    throw new LinkRequiredError({
      used: quota.used,
      max: quota.max,
      remaining: quota.remaining,
    });
  }
}

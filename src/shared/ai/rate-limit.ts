/**
 * AI 同定リクエストのレート制限 ([SEC-001] AI コスト爆発防止)
 *
 * Upstash Ratelimit (Redis REST) を `RateLimiter` (DI) として注入する。
 * 本モジュールは key 構築 + 判定 → RateLimitedError 変換のみ担う。
 *
 * 関連: docs/_shared/ai/revise_sec_001-003_rate_limit_ssrf_20260523/001_REVISE_SPEC.md §7.1/§7.5
 */
import { RateLimitedError } from './errors';

/** /api/identify-plant の上限 (10 req/min/uid) */
export const IDENTIFY_RATE_LIMIT = { limit: 10, windowSec: 60 } as const;

export type RateLimitResult = {
  success: boolean;
  remaining: number;
  /** limit リセット時刻 (unix ms) */
  resetAtMs: number;
};

/** 実体は @upstash/ratelimit を Vercel Function で注入 */
export type RateLimiter = {
  limit(key: string): Promise<RateLimitResult>;
};

/** identify のキーを構築する (`identify:${userId}`)。 */
export function identifyRateLimitKey(userId: string): string {
  return `identify:${userId}`;
}

/**
 * identify リクエストのレート制限をチェックする。
 * 超過時は RateLimitedError (retryAtMs = resetAtMs) を throw。
 */
export async function checkIdentifyRateLimit(
  limiter: RateLimiter,
  userId: string,
): Promise<void> {
  const result = await limiter.limit(identifyRateLimitKey(userId));
  if (!result.success) {
    throw new RateLimitedError(result.resetAtMs);
  }
}

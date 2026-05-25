/**
 * Upstash Ratelimit binding ([SEC-001] AI コスト爆発防止の実体)
 *
 * `src/shared/ai/rate-limit.ts` の `RateLimiter` interface を @upstash/ratelimit (Redis REST) で実装する。
 * core の `checkIdentifyRateLimit` が本 binding を受け取り 10 req/min/uid を強制する。
 * SDK 依存はこのファイルに隔離し、handler は dynamic import する。
 *
 * 関連: docs/_shared/ai/revise_sec_001-003_rate_limit_ssrf_20260523/001_REVISE_SPEC.md §7, concept §8 [論点-011]
 */
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';
import { IDENTIFY_RATE_LIMIT, type RateLimiter } from '../../src/shared/ai/rate-limit';

export type UpstashConfig = { url: string; token: string };

/** Upstash 接続情報を env から読み出す (純関数、不足時 throw)。 */
export function loadUpstashConfig(env: NodeJS.ProcessEnv = process.env): UpstashConfig {
  const url = env.UPSTASH_REDIS_REST_URL;
  const token = env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) {
    throw new Error('Upstash config missing: UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN');
  }
  return { url, token };
}

/** @upstash/ratelimit の `limit()` 戻り値の必要部分。 */
export type UpstashLimitResult = { success: boolean; remaining: number; reset: number };
export type UpstashLimiter = { limit(key: string): Promise<UpstashLimitResult> };

/** Upstash の limiter を hana-memo の `RateLimiter` interface に適合させる (純関数)。 */
export function toRateLimiter(upstash: UpstashLimiter): RateLimiter {
  return {
    limit: async (key) => {
      const r = await upstash.limit(key);
      return { success: r.success, remaining: r.remaining, resetAtMs: r.reset };
    },
  };
}

export type IdentifyRateLimiterDeps = {
  /** テスト/再利用注入用。既定は env から Redis を生成。 */
  redis?: ConstructorParameters<typeof Ratelimit>[0]['redis'];
  env?: NodeJS.ProcessEnv;
};

/** /api/identify-plant 用の sliding-window レートリミッタ (10 req/min/uid) を生成する。 */
export function createIdentifyRateLimiter(deps: IdentifyRateLimiterDeps = {}): RateLimiter {
  const redis = deps.redis ?? new Redis(loadUpstashConfig(deps.env));
  const upstash = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(
      IDENTIFY_RATE_LIMIT.limit,
      `${IDENTIFY_RATE_LIMIT.windowSec} s`,
    ),
    prefix: 'ratelimit:identify',
    analytics: false,
  });
  return toRateLimiter(upstash);
}

/** /api/auth/guest の上限 (匿名 user 量産 = Clerk MAU 濫用の防止 [SEC-001])。10 req / 10 min / key。 */
export const GUEST_RATE_LIMIT = { limit: 10, windowSec: 600 } as const;

/** /api/auth/guest 用の sliding-window レートリミッタを生成する (key = fingerprint or IP)。 */
export function createGuestRateLimiter(deps: IdentifyRateLimiterDeps = {}): RateLimiter {
  const redis = deps.redis ?? new Redis(loadUpstashConfig(deps.env));
  const upstash = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(GUEST_RATE_LIMIT.limit, `${GUEST_RATE_LIMIT.windowSec} s`),
    prefix: 'ratelimit:guest',
    analytics: false,
  });
  return toRateLimiter(upstash);
}

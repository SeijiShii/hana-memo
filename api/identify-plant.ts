/**
 * AI 植物同定エンドポイント (POST /api/identify-plant)
 *
 * Clerk JWT 検証 → Neon users.id 解決 → [SEC-001] Upstash レート制限 (10/min) → 所有確認 →
 * quota → R2 GET presign → OpenAI Vision (retry) → 構造化出力パース → discoveries/api_usage 書込。
 * オーケストレーション本体 `runIdentify` は副作用を deps 注入し SDK/DB 非依存で単体テスト可能。
 *
 * 関連: docs/_shared/ai/001_ai_SPEC.md §1.2/§4, concept §8 [論点-011] SEC-001 closure
 */
import { verifyClerkSession, UnauthorizedError } from './_lib/clerk';
import { resolveUserId, UserNotFoundError } from './_lib/user';
import type { ChatCompletionFn } from './_lib/openai';
import { callIdentifyVision } from './_lib/openai';
import { checkIdentifyRateLimit, type RateLimiter } from '../src/shared/ai/rate-limit';
import { consumeQuota } from '../src/shared/ai/quota';
import { buildIdentifyPrompt } from '../src/shared/ai/prompt';
import { parseIdentifyResponse } from '../src/shared/ai/schema';
import { withRetry } from '../src/shared/ai/retry';
import {
  QuotaExceededError,
  RateLimitedError,
  SchemaValidationError,
} from '../src/shared/ai/errors';
import { createSignedUrl, type PresignClient } from '../src/shared/storage/presign';
import { validateObjectKey, ValidationError } from '../src/shared/helpers/url';
import type { IdentifyInput, IdentifyResult } from '../src/shared/types/ai';
import type { Season } from '../src/shared/types/domain';

const SEASONS: readonly Season[] = ['spring', 'summer', 'autumn', 'winter'];

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

/** request body を IdentifyInput に検証・正規化する (純関数)。 */
export function parseIdentifyBody(raw: unknown): IdentifyInput {
  const b = (raw ?? {}) as Record<string, unknown>;
  const discoveryId = typeof b.discoveryId === 'string' ? b.discoveryId : '';
  const imageObjectKey = typeof b.imageObjectKey === 'string' ? b.imageObjectKey : '';
  const capturedAt = typeof b.capturedAt === 'string' ? b.capturedAt : '';
  if (!discoveryId || !imageObjectKey || !capturedAt) {
    throw new ValidationError('discoveryId / imageObjectKey / capturedAt are required');
  }
  if (typeof b.season !== 'string' || !SEASONS.includes(b.season as Season)) {
    throw new ValidationError('invalid season');
  }
  const out: IdentifyInput = {
    discoveryId,
    imageObjectKey,
    capturedAt,
    season: b.season as Season,
  };
  if (isObject(b.location) && typeof b.location.lat === 'number' && typeof b.location.lng === 'number') {
    out.location = { lat: b.location.lat, lng: b.location.lng };
  }
  if (typeof b.userNote === 'string') {
    out.userNote = b.userNote;
  }
  return out;
}

export type IdentifyDeps = {
  rateLimiter: RateLimiter;
  presign: PresignClient;
  complete: ChatCompletionFn;
  /** 現在の AI quota 残を返す。 */
  getQuotaRemaining: () => Promise<number>;
  /** 同定結果 + 消費後 quota を永続化する。 */
  persist: (args: {
    discoveryId: string;
    result: IdentifyResult;
    quotaRemaining: number;
  }) => Promise<void>;
  /** retry backoff sleep (テスト注入)。 */
  sleep?: (ms: number) => Promise<void>;
};

/**
 * 同定のオーケストレーション (副作用は deps 注入、SDK/DB 非依存)。
 * rate limit → 所有確認 → quota → presign → OpenAI(retry) → parse → persist の順。
 */
export async function runIdentify(
  userId: string,
  input: IdentifyInput,
  deps: IdentifyDeps,
): Promise<IdentifyResult> {
  await checkIdentifyRateLimit(deps.rateLimiter, userId); // [SEC-001] RateLimitedError
  validateObjectKey(input.imageObjectKey, userId); // 所有確認 ([SEC-003]/[SEC-005])
  const remaining = await deps.getQuotaRemaining();
  const quotaAfter = consumeQuota(remaining); // QuotaExceededError
  const imageUrl = await createSignedUrl(deps.presign, {
    objectKey: input.imageObjectKey,
    userId,
  });
  const prompt = buildIdentifyPrompt(input, imageUrl);
  const content = await withRetry(() => callIdentifyVision(deps.complete, prompt, imageUrl), {
    sleep: deps.sleep,
    isRetryable: (err) => !(err instanceof SchemaValidationError),
  });
  const result = parseIdentifyResponse(content); // SchemaValidationError
  await deps.persist({ discoveryId: input.discoveryId, result, quotaRemaining: quotaAfter });
  return result;
}

function jsonResponse(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

/** runIdentify が throw した例外を HTTP ステータスにマップする。 */
function mapError(err: unknown): Response {
  if (err instanceof RateLimitedError) {
    return jsonResponse({ error: 'rate_limited', retryAtMs: err.retryAtMs }, 429);
  }
  if (err instanceof QuotaExceededError) {
    return jsonResponse({ error: 'quota_exceeded' }, 402);
  }
  if (err instanceof ValidationError) {
    return jsonResponse({ error: 'forbidden' }, 403); // 所有者違反
  }
  if (err instanceof UserNotFoundError) {
    return jsonResponse({ error: 'user_not_found' }, err.status);
  }
  // OpenAI 失敗 / schema 不適合 (E-AI-001/003/006): pending 相当、上位で再識別可能
  return jsonResponse({ error: 'identify_failed' }, 502);
}

/** 実 deps を組み立てて runIdentify を実行する handler 用ヘルパ。 */
async function buildRealDeps(userId: string): Promise<IdentifyDeps> {
  const [{ createIdentifyRateLimiter }, { createChatCompletionFn }, { createR2PresignClient }] =
    await Promise.all([
      import('./_lib/ratelimit'),
      import('./_lib/openai'),
      import('./storage/_lib/r2'),
    ]);
  return {
    rateLimiter: createIdentifyRateLimiter(),
    presign: createR2PresignClient(),
    complete: createChatCompletionFn(),
    getQuotaRemaining: () => fetchQuotaRemaining(userId),
    persist: (args) => persistIdentify(userId, args),
  };
}

async function fetchQuotaRemaining(userId: string): Promise<number> {
  const [{ db }, { users }, { eq }] = await Promise.all([
    import('../src/shared/db/client'),
    import('../src/shared/db/schema'),
    import('drizzle-orm'),
  ]);
  const rows = await db
    .select({ remaining: users.aiCreditsRemaining })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  return rows[0]?.remaining ?? 0;
}

async function persistIdentify(
  userId: string,
  args: { discoveryId: string; result: IdentifyResult; quotaRemaining: number },
): Promise<void> {
  const [{ db }, { discoveries, users, apiUsage }, { eq, and }] = await Promise.all([
    import('../src/shared/db/client'),
    import('../src/shared/db/schema'),
    import('drizzle-orm'),
  ]);
  const { result } = args;
  await db
    .update(discoveries)
    .set({
      commonName: result.commonName,
      scientificName: result.scientificName,
      family: result.family,
      genus: result.genus,
      keyFeatures: result.keyFeatures,
      confidence: result.confidence,
      similarSpecies: result.similarSpecies,
      status: result.status,
      updatedAt: new Date(),
    })
    .where(and(eq(discoveries.id, args.discoveryId), eq(discoveries.userId, userId)));
  await db.update(users).set({ aiCreditsRemaining: args.quotaRemaining }).where(eq(users.id, userId));
  await db
    .insert(apiUsage)
    .values({ userId, service: 'openai', endpoint: 'identify-plant', imageCount: 1, success: true });
}

export const config = { runtime: 'nodejs' };

/** Vercel Web handler。 */
export default async function handler(req: Request): Promise<Response> {
  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 });
  }

  let clerkUserId: string;
  try {
    ({ clerkUserId } = await verifyClerkSession(req));
  } catch (err) {
    return jsonResponse({ error: 'unauthorized' }, err instanceof UnauthorizedError ? err.status : 500);
  }

  let input: IdentifyInput;
  try {
    input = parseIdentifyBody(await req.json().catch(() => ({})));
  } catch {
    return jsonResponse({ error: 'bad_request' }, 400);
  }

  let userId: string;
  try {
    userId = await resolveUserId(clerkUserId);
  } catch (err) {
    return mapError(err);
  }

  try {
    const deps = await buildRealDeps(userId);
    const result = await runIdentify(userId, input, deps);
    return jsonResponse(result, 200);
  } catch (err) {
    return mapError(err);
  }
}

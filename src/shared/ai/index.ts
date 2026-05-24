// _shared/ai barrel (SDK 非依存コア)
// 関連: docs/_shared/ai/001_ai_SPEC.md + revise_sec_001-003 ([SEC-001]/[SEC-003])
// OpenAI SDK / Upstash binding / Vercel handler / frontend identify は app/api bootstrap フェーズで追加
export {
  QuotaExceededError,
  AiServiceError,
  SchemaValidationError,
  AfterRetryError,
  RateLimitedError,
} from './errors';
export { SYSTEM_PROMPT, buildIdentifyPrompt, type IdentifyPrompt } from './prompt';
export { IDENTIFY_SCHEMA, parseIdentifyResponse, deriveStatus } from './schema';
export { checkQuota, consumeQuota } from './quota';
export {
  IDENTIFY_RATE_LIMIT,
  identifyRateLimitKey,
  checkIdentifyRateLimit,
  type RateLimiter,
  type RateLimitResult,
} from './rate-limit';
export { BACKOFF_MS, withRetry, type RetryOptions } from './retry';
export { identifyPlant, retryIdentify, type IdentifyClientOptions } from './identify';

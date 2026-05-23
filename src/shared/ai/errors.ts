/**
 * AI クライアント例外型
 * 関連: docs/_shared/ai/001_ai_SPEC.md §4.2,
 *      docs/_shared/ai/revise_sec_001-003_rate_limit_ssrf_20260523/001_REVISE_SPEC.md §7.4 (E-AI-007)
 */

/** quota 超過 (E-AI-005、402) */
export class QuotaExceededError extends Error {
  constructor(message = 'AI quota exceeded') {
    super(message);
    this.name = 'QuotaExceededError';
  }
}

/** OpenAI 5xx / timeout (E-AI-001/006) */
export class AiServiceError extends Error {
  constructor(
    message = 'AI service error',
    public override readonly cause?: unknown,
  ) {
    super(message);
    this.name = 'AiServiceError';
  }
}

/** OpenAI Structured Output 不適合 (E-AI-003) */
export class SchemaValidationError extends Error {
  constructor(public readonly reason: string) {
    super(`SchemaValidation: ${reason}`);
    this.name = 'SchemaValidationError';
  }
}

/** retry 尽きた */
export class AfterRetryError extends Error {
  constructor(
    message: string,
    public override readonly cause?: unknown,
  ) {
    super(message);
    this.name = 'AfterRetryError';
  }
}

/** Upstash rate limit 超過 (E-AI-007、429、[SEC-001]) */
export class RateLimitedError extends Error {
  constructor(public readonly retryAtMs: number) {
    super('rate_limited');
    this.name = 'RateLimitedError';
  }
}

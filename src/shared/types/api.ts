// API レスポンス契約 (Vercel Function 共通)
// 関連: docs/_shared/ai/revise_sec_001-003_rate_limit_ssrf_20260523/001_REVISE_SPEC.md §7.2
//      [SEC-001] 429 rate_limited 契約全エンドポイント統一

export type ApiError =
  | { error: 'unauthorized'; message?: string }
  | { error: 'forbidden'; message?: string }
  | { error: 'rate_limited'; retry_at: number /* unix ms */ }
  | { error: 'quota_exceeded'; message?: string }
  | { error: 'validation_error'; reason: string }
  | { error: 'internal_error'; message?: string };

export type ApiResponse<T> = { ok: true; data: T } | ({ ok: false } & ApiError);

// 429 レスポンスヘッダ (`Retry-After` 秒) は HTTP ヘッダで送る、body は ApiError の rate_limited
export const isRateLimitedError = (
  err: unknown,
): err is { error: 'rate_limited'; retry_at: number } => {
  return (
    typeof err === 'object' &&
    err !== null &&
    'error' in err &&
    (err as { error: unknown }).error === 'rate_limited'
  );
};

export const isValidationError = (
  err: unknown,
): err is { error: 'validation_error'; reason: string } => {
  return (
    typeof err === 'object' &&
    err !== null &&
    'error' in err &&
    (err as { error: unknown }).error === 'validation_error'
  );
};

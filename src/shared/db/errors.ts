/**
 * DB エラー型定義
 * 関連: docs/_shared/db/001_db_SPEC.md §4.2 (E-DB-001〜E-DB-005)
 */

export class DbError extends Error {
  constructor(
    public readonly code:
      | 'E-DB-001' // DATABASE_URL 不正
      | 'E-DB-002' // Neon コンピュート 0 (auto-suspend) / cold start
      | 'E-DB-003' // UNIQUE 違反 (idempotent OK)
      | 'E-DB-004' // CHECK 違反
      | 'E-DB-005', // コネクション枯渇
    message: string,
    public readonly cause?: unknown,
  ) {
    super(`[${code}] ${message}`);
    this.name = 'DbError';
  }
}

export function isUniqueViolation(err: unknown): boolean {
  if (!err || typeof err !== 'object') return false;
  const code = (err as { code?: unknown }).code;
  return code === '23505'; // PostgreSQL unique_violation
}

export function isCheckViolation(err: unknown): boolean {
  if (!err || typeof err !== 'object') return false;
  const code = (err as { code?: unknown }).code;
  return code === '23514'; // PostgreSQL check_violation
}

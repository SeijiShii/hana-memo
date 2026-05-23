/**
 * 認証・認可の例外型 (基盤、他モジュールが import する)
 *
 * 関連: docs/_shared/auth/001_auth_SPEC.md §6.2, 002_auth_PLAN.md §1.1
 */

/** trial 上限に達し、継続には OAuth リンクが必要 (E-AU-004) */
export class LinkRequiredError extends Error {
  constructor(
    public readonly quota?: { used: number; max: number; remaining: number },
  ) {
    super('Trial limit reached. Link a Google account to continue.');
    this.name = 'LinkRequiredError';
  }
}

/** Clerk Guest sign-in 失敗等、認証基盤の初期化不能 (E-AU-001) */
export class AuthInitError extends Error {
  constructor(
    message = 'Failed to initialize authentication',
    public override readonly cause?: unknown,
  ) {
    super(message);
    this.name = 'AuthInitError';
  }
}

/** OAuth callback の state 不一致 / 重複リンク等 (E-AU-002 / E-AU-003) */
export class OAuthCallbackError extends Error {
  constructor(
    message: string,
    public readonly code?: 'state_mismatch' | 'identity_already_exists' | 'invalid_url',
  ) {
    super(message);
    this.name = 'OAuthCallbackError';
  }
}

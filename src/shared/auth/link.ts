/**
 * Google OAuth Linking ロジック (匿名 user → Google アカウント連携)
 *
 * Clerk の `user.createExternalAccount({ strategy: 'oauth_google', redirectUrl })` で連携を開始し、
 * 返却された `verification.externalVerificationRedirectURL` へ遷移する。連携状態の判定
 * (`isLinked` / `getIdentities`) と callback URL 検証は SDK 非依存の純関数。
 *
 * 関連: docs/_shared/auth/001_auth_SPEC.md §1.1 / §4.2 (E-AU-002/003), 003_auth_UNIT_TEST.md §1.2
 */
import { OAuthCallbackError } from './errors';

/** Clerk external account の最小形 (provider 名のみ参照)。 */
export type ExternalAccountLike = {
  /** Clerk は 'google' / 'oauth_google' いずれの表現も取り得るため正規化する。 */
  provider?: string | null;
  emailAddress?: string | null;
};

/** UI 表示用の連携 identity。 */
export type Identity = {
  provider: string;
  email: string | null;
};

/** 連携開始に必要な Clerk user の最小インターフェース (テスト注入可能)。 */
export type LinkableUser = {
  externalAccounts?: ExternalAccountLike[];
  createExternalAccount: (params: { strategy: 'oauth_google'; redirectUrl: string }) => Promise<{
    verification?: {
      externalVerificationRedirectURL?: URL | string | null;
    } | null;
  }>;
};

function normalizeProvider(provider: string | null | undefined): string {
  return (provider ?? '').replace(/^oauth_/, '');
}

/** external accounts から UI 用 identity 配列を導出する (純関数)。 */
export function getIdentities(accounts: ExternalAccountLike[] | undefined): Identity[] {
  return (accounts ?? []).map((a) => ({
    provider: normalizeProvider(a.provider),
    email: a.emailAddress ?? null,
  }));
}

/** Google 連携済みか (純関数、UT-AU-L07/L08)。 */
export function isLinked(accounts: ExternalAccountLike[] | undefined): boolean {
  return getIdentities(accounts).some((i) => i.provider === 'google');
}

/** Clerk の重複連携エラー (identifier_already_signed_in 等) を判定する。 */
function isIdentityAlreadyExists(err: unknown): boolean {
  const code = (err as { errors?: { code?: string }[] })?.errors?.[0]?.code;
  return (
    code === 'identity_already_exists' ||
    code === 'external_account_exists' ||
    code === 'identifier_already_signed_in'
  );
}

/**
 * Google OAuth 連携を開始する。
 * - 既に連携済なら NoOp + console.info (UT-AU-L02)
 * - 成功時は Clerk が返す検証 URL へ redirect
 * - 重複連携は E-AU-003 のガイダンスエラーに変換 (UT-AU-L05)
 */
export async function linkWithGoogle(
  user: LinkableUser,
  opts: { redirectUrl: string; redirect?: (url: string) => void },
): Promise<void> {
  if (isLinked(user.externalAccounts)) {
    console.info('linkWithGoogle: already linked to Google, skipping.');
    return;
  }
  try {
    const ext = await user.createExternalAccount({
      strategy: 'oauth_google',
      redirectUrl: opts.redirectUrl,
    });
    const target = ext.verification?.externalVerificationRedirectURL;
    if (target) {
      const url = target.toString();
      (opts.redirect ?? defaultRedirect)(url);
    }
  } catch (err) {
    if (isIdentityAlreadyExists(err)) {
      throw new OAuthCallbackError(
        'This Google account is already linked to another device.',
        'identity_already_exists',
      );
    }
    throw err;
  }
}

function defaultRedirect(url: string): void {
  if (typeof window !== 'undefined') {
    window.location.assign(url);
  }
}

/**
 * OAuth callback URL を検証する (http/https のみ許可、UT-AU-L04/E02)。
 * 形式不正・非対応プロトコルは OAuthCallbackError(invalid_url)。
 */
export function assertValidCallbackUrl(rawUrl: string): URL {
  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    throw new OAuthCallbackError(`Invalid callback URL: ${rawUrl}`, 'invalid_url');
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new OAuthCallbackError(
      `Unsupported callback protocol: ${parsed.protocol}`,
      'invalid_url',
    );
  }
  return parsed;
}

/**
 * callback の state 整合性を検証する (CSRF 対策、E-AU-002)。
 * 不一致なら OAuthCallbackError(state_mismatch)。
 */
export function assertStateMatches(expected: string | null, actual: string | null): void {
  if (!expected || !actual || expected !== actual) {
    throw new OAuthCallbackError('OAuth state mismatch', 'state_mismatch');
  }
}

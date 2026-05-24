/**
 * Sentry 実 SDK バインディング ([SEC-004] PII スクラブの本番 wiring)
 *
 * `@sentry/browser` を `SentryLike` に適合させ、`initSentry` (opt-in ゲート + beforeSend スクラブ +
 * uid hash 化) に注入する。これにより本番の Sentry 送信が必ず `scrubBeforeSend` を通る = [SEC-004] closure。
 * SDK 依存はこのファイルに隔離し、ロジックは sentry.ts (SDK 非依存) 側でテスト済。
 *
 * 関連: docs/_shared/analytics/sentry.ts, concept §8 [論点-014] SEC-004
 */
import * as Sentry from '@sentry/browser';
import { initSentry, type SentryLike, type SentryUser } from './sentry';

/** @sentry/browser を SentryLike に適合させる。 */
export function createSentryClient(): SentryLike {
  return {
    init: (options) => {
      // SentryInitOptions (scrub 済 beforeSend/beforeBreadcrumb) を実 SDK options に渡す。
      Sentry.init(options as unknown as Parameters<typeof Sentry.init>[0]);
    },
    captureException: (err, hint) => {
      Sentry.captureException(err, hint);
    },
  };
}

export type InitBrowserSentryDeps = {
  /** テスト/再利用注入用。既定は @sentry/browser ベースの client。 */
  client?: SentryLike;
  /** 既定は VITE_SENTRY_DSN。 */
  dsn?: string;
};

/**
 * ブラウザ Sentry を初期化する ([SEC-004] beforeSend スクラブ込み)。
 * - DSN 未設定 → skip (返り値 false)
 * - opt-out user → initSentry 内で skip
 */
export async function initBrowserSentry(
  user: SentryUser,
  deps: InitBrowserSentryDeps = {},
): Promise<boolean> {
  const dsn =
    deps.dsn ??
    (import.meta.env?.VITE_SENTRY_DSN as string | undefined);
  if (!dsn) {
    return false;
  }
  const client = deps.client ?? createSentryClient();
  await initSentry(user, { dsn }, client);
  return true;
}

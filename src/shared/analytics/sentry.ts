/**
 * Sentry エラー監視ラッパ ([SEC-004] PII スクラブ + opt-in ゲート + Clerk uid hash 化)
 *
 * 設計方針: `@sentry/browser` を直接 import せず、必要な操作を `SentryLike` interface に切り出して
 * **注入**する。これにより (1) SDK 非依存で Node テスト可能、(2) frontend / Vercel Function の
 * どちらの実 SDK でも wiring 可能、になる。実 SDK の bind は app bootstrap で行う。
 *
 * 関連: docs/_shared/analytics/001_analytics_SPEC.md §1.1 / §6.1
 *      docs/_shared/analytics/revise_sec_004_sentry_pii_scrub_20260523/001_REVISE_SPEC.md §7.2
 */
import { scrub } from './scrubber';
import { sha256Hex } from '../helpers/id';

/** initSentry が必要とする user の最小形 (domain User からは呼び出し側でマップ) */
export type SentryUser = {
  /** Clerk user id (raw)。Sentry には hash 化して渡す */
  id: string;
  /** user_settings.analytics_opt_in。false なら Sentry を完全 OFF */
  analyticsOptIn: boolean;
};

export type SentryEvent = Record<string, unknown> & {
  message?: string;
  exception?: { values?: { value?: string }[] };
  breadcrumbs?: Record<string, unknown>[];
};

export type SentryBreadcrumb = Record<string, unknown> & { message?: string };

export type SentryInitOptions = {
  dsn: string;
  beforeSend: (event: SentryEvent) => SentryEvent | null;
  beforeBreadcrumb: (crumb: SentryBreadcrumb) => SentryBreadcrumb | null;
  initialScope: { user: { id: string } };
};

/** 実 SDK (@sentry/browser など) が満たす最小インターフェース */
export type SentryLike = {
  init: (options: SentryInitOptions) => void;
  captureException: (err: unknown, hint?: { extra?: Record<string, unknown> }) => void;
};

/** beforeSend フック: event 全体を再帰スクラブ ([SEC-004] 法令核) */
export function scrubBeforeSend(event: SentryEvent): SentryEvent {
  return scrub(event);
}

/** beforeBreadcrumb フック: breadcrumb を再帰スクラブ */
export function scrubBeforeBreadcrumb(crumb: SentryBreadcrumb): SentryBreadcrumb {
  return scrub(crumb);
}

/**
 * Sentry を初期化する。
 * - `analyticsOptIn=false` → init を完全 skip (PII 流出ゼロ、データ最小化原則)
 * - `analyticsOptIn=true` → beforeSend / beforeBreadcrumb スクラブ + Clerk uid を SHA-256 hash 化して init
 */
export async function initSentry(
  user: SentryUser,
  opts: { dsn: string },
  client: SentryLike,
): Promise<void> {
  if (!user.analyticsOptIn) return; // opt-out: 完全 OFF
  const hashedId = await sha256Hex(user.id);
  client.init({
    dsn: opts.dsn,
    beforeSend: scrubBeforeSend,
    beforeBreadcrumb: scrubBeforeBreadcrumb,
    initialScope: { user: { id: hashedId } },
  });
}

/**
 * 例外を Sentry に送信する。
 * - context は scrub 経由で extra に載せる
 * - error 本体の message / stack は SDK が event に変換 → init の beforeSend で再帰スクラブされる
 *   (raw Error の非列挙プロパティを壊さないよう、ここでは error をそのまま渡す)
 */
export function captureException(
  err: Error,
  context: Record<string, unknown> | undefined,
  client: SentryLike,
): void {
  const safeContext = context ? scrub(context) : undefined;
  client.captureException(err, safeContext ? { extra: safeContext } : undefined);
}

/**
 * Slack Webhook 通知 ([SEC-004] 通知本文を scrub 経由で PII マスク)
 *
 * Vercel Cron (`api/check-quota`, `api/export-revenue`) が通知本文を組み立てた直後に
 * 本モジュール経由で送ることで、PII 混入をゼロにする。fetch は注入可 (テスト容易性)。
 *
 * 関連: docs/_shared/analytics/revise_sec_004_sentry_pii_scrub_20260523/001_REVISE_SPEC.md §7.2
 *      docs/_shared/analytics/902_analytics_IMPL_SECURITY_CHECKLIST.md §3
 */
import { scrub } from './scrubber';

/** Slack Webhook に送る body。text は必ず scrub 済み */
export type SlackPayload = { text: string };

/** 通知文を scrub して Slack payload を組み立てる (純関数) */
export function buildSlackPayload(text: string): SlackPayload {
  return { text: scrub(text) };
}

type FetchLike = (
  input: string,
  init: { method: string; headers: Record<string, string>; body: string },
) => Promise<{ ok: boolean; status: number }>;

/**
 * Slack に通知を送る。
 * - webhookUrl 未設定 (E-AN-003) → console.warn + skip、`false` を返す
 * - 設定あり → scrub 済み body を POST、`true` を返す
 */
export async function notifySlack(
  webhookUrl: string | undefined,
  text: string,
  fetchImpl: FetchLike = fetch as unknown as FetchLike,
): Promise<boolean> {
  if (!webhookUrl) {
    console.warn('notifySlack: SLACK_*_WEBHOOK_URL 未設定のためアラートをスキップしました');
    return false;
  }
  const payload = buildSlackPayload(text);
  await fetchImpl(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return true;
}

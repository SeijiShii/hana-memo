/**
 * 予算超過チェック cron (GET /api/check-quota、日次 04:00)
 *
 * Vercel Cron 認証 → 当月の OpenAI 概算コスト合計を集計 → 予算閾値超過なら Slack 通知 ([SEC-004]
 * scrub 経由)。判定 `evaluateQuotaAlert` は純関数で単体テスト可能。
 *
 * 関連: docs/_shared/analytics/cost.ts / slack.ts, concept §4.6.2, vercel.json crons
 */
import { assertCronAuth, CronAuthError } from './_lib/cron';
import { notifySlack } from '../src/shared/analytics/slack';

export type QuotaAlert = { alert: boolean; ratio: number; message: string };

/** 当月の年月 (YYYY-MM)。 */
export function currentYearMonth(now: Date = new Date()): string {
  return now.toISOString().slice(0, 7);
}

/** 月次コストが予算閾値 (既定 80%) を超えたかを判定する (純関数)。 */
export function evaluateQuotaAlert(input: {
  costUsd: number;
  budgetUsd: number;
  thresholdRatio?: number;
}): QuotaAlert {
  const threshold = input.thresholdRatio ?? 0.8;
  const ratio = input.budgetUsd > 0 ? input.costUsd / input.budgetUsd : 0;
  const alert = ratio >= threshold;
  const pct = (ratio * 100).toFixed(0);
  const amounts = `$${input.costUsd.toFixed(2)} / $${input.budgetUsd.toFixed(2)}`;
  const message = alert
    ? `⚠️ OpenAI 月次コストが予算の ${pct}% に到達 (${amounts})`
    : `OpenAI 月次コスト: ${amounts} (${pct}%)`;
  return { alert, ratio, message };
}

async function fetchSystemMonthlyCostUsd(yearMonth: string): Promise<number> {
  const [{ db }, { sql }] = await Promise.all([
    import('../src/shared/db/client'),
    import('drizzle-orm'),
  ]);
  const res = await db.execute(
    sql`SELECT COALESCE(SUM(estimated_cost_usd), 0) AS cost FROM api_usage_monthly WHERE year_month = ${yearMonth}`,
  );
  const rows = Array.isArray(res) ? res : ((res as { rows?: unknown[] }).rows ?? []);
  const row = rows[0] as { cost?: number | string } | undefined;
  return Number(row?.cost ?? 0);
}

function jsonResponse(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

export const config = { runtime: 'nodejs' };

/** Vercel Cron handler。 */
async function handler(req: Request): Promise<Response> {
  try {
    assertCronAuth(req);
  } catch (err) {
    return jsonResponse({ error: 'unauthorized' }, err instanceof CronAuthError ? err.status : 500);
  }
  try {
    const budgetUsd = Number(process.env.OPENAI_MONTHLY_BUDGET_USD ?? 30);
    const costUsd = await fetchSystemMonthlyCostUsd(currentYearMonth());
    const result = evaluateQuotaAlert({ costUsd, budgetUsd });
    if (result.alert) {
      await notifySlack(process.env.SLACK_QUOTA_WEBHOOK_URL, result.message);
    }
    return jsonResponse({ ok: true, alert: result.alert, ratio: result.ratio }, 200);
  } catch (err) {
    console.error('check-quota failed', err);
    return jsonResponse({ error: 'internal' }, 500);
  }
}

export default { fetch: handler };

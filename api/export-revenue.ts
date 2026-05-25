/**
 * 月次収益エクスポート cron (GET /api/export-revenue、月初 05:00)
 *
 * Vercel Cron 認証 → 前月の billing_unlocks を集計 → CSV 生成 → R2 (private) に保存 →
 * Slack 通知 ([SEC-004] scrub 経由)。集計対象 0 件でも CSV ヘッダのみ保存し「収益なし」を通知。
 * オーケストレーション `runExportRevenue` は副作用を deps 注入し SDK/DB 非依存で単体テスト可能。
 *
 * 関連: docs/billing/001_billing_SPEC.md §1 UC5, 002_billing_PLAN.md Phase 4 (UT-BL-ER01/ER02/ER06),
 *       concept §4.6.4.1, vercel.json crons
 */
import { assertCronAuth, CronAuthError } from './_lib/cron';
import { buildRevenueCsv, type RevenueRow } from '../src/features/billing/revenue';

/** 前月の年月 (YYYY-MM)。 */
export function previousYearMonth(now: Date = new Date()): string {
  const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1));
  return d.toISOString().slice(0, 7);
}

export type ExportRevenueDeps = {
  yearMonth: string;
  /** 対象月の集計済み収益行を返す (0 件可)。 */
  fetchRows: (yearMonth: string) => Promise<RevenueRow[]>;
  /** CSV を保存先 (R2 private) に書き込む。 */
  saveCsv: (objectKey: string, csv: string) => Promise<void>;
  /** Slack 通知 (URL 未設定時は内部で console.warn して false)。 */
  notify: (text: string) => Promise<boolean>;
};

/**
 * 収益エクスポートのオーケストレーション (副作用は deps 注入)。
 * 0 件 → ヘッダのみ CSV 保存 + 「収益なし」通知 (UT-BL-ER02)。
 */
export async function runExportRevenue(
  deps: ExportRevenueDeps,
): Promise<{ rowCount: number; objectKey: string; notified: boolean }> {
  const rows = await deps.fetchRows(deps.yearMonth);
  const csv = buildRevenueCsv(rows);
  const objectKey = `revenue/${deps.yearMonth}.csv`;
  await deps.saveCsv(objectKey, csv);

  const message =
    rows.length === 0
      ? `月次収益レポート ${deps.yearMonth}: 収益なし (0 件)`
      : `月次収益レポート ${deps.yearMonth}: ${rows.length} 行を ${objectKey} に保存`;
  const notified = await deps.notify(message);
  return { rowCount: rows.length, objectKey, notified };
}

function jsonResponse(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

/** 前月の billing_unlocks を月次行に集計する (粗利は cost を別途集計)。 */
async function fetchRevenueRows(yearMonth: string): Promise<RevenueRow[]> {
  const [{ db }, { sql }] = await Promise.all([
    import('../src/shared/db/client'),
    import('drizzle-orm'),
  ]);
  const res = await db.execute(sql`
    SELECT
      COUNT(DISTINCT bu.user_id)::int AS paid_users,
      COALESCE(SUM(bu.amount_jpy), 0)::int AS net_revenue,
      (SELECT COALESCE(SUM(estimated_cost_usd), 0) FROM api_usage_monthly WHERE year_month = ${yearMonth})::float AS cost_usd
    FROM billing_unlocks bu
    WHERE to_char(bu.created_at, 'YYYY-MM') = ${yearMonth}
  `);
  const rows = Array.isArray(res) ? res : ((res as { rows?: unknown[] }).rows ?? []);
  const r = rows[0] as
    | { paid_users?: number; net_revenue?: number; cost_usd?: number }
    | undefined;
  const paidUsers = Number(r?.paid_users ?? 0);
  const netRevenueJpy = Number(r?.net_revenue ?? 0);
  if (paidUsers === 0 && netRevenueJpy === 0) {
    return [];
  }
  // USD コストを概算 JPY 換算 (¥150/$、§4.6.2 の概算前提)。
  const externalApiCostJpy = Math.round(Number(r?.cost_usd ?? 0) * 150);
  return [
    {
      date: yearMonth,
      paidUsers,
      newSignups: 0,
      netRevenueJpy,
      externalApiCostJpy,
    },
  ];
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
    const [{ createR2Writer }, { notifySlack }] = await Promise.all([
      import('./storage/_lib/r2'),
      import('../src/shared/analytics/slack'),
    ]);
    const writer = createR2Writer();
    const result = await runExportRevenue({
      yearMonth: previousYearMonth(),
      fetchRows: fetchRevenueRows,
      saveCsv: (objectKey, csv) => writer(objectKey, csv, 'text/csv'),
      notify: (text) => notifySlack(process.env.SLACK_REVENUE_WEBHOOK_URL, text),
    });
    return jsonResponse({ ok: true, ...result }, 200);
  } catch (err) {
    console.error('export-revenue failed', err);
    return jsonResponse({ error: 'internal' }, 500);
  }
}

export default { fetch: handler };

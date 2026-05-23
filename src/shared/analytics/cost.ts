/**
 * コストログ ([§4.6.2] OpenAI 呼出ログ + 月次集計 + 概算コスト)
 *
 * - logApiUsage: api_usage に Drizzle INSERT (fail-soft、本処理をブロックしない)
 * - getMonthlyUsage: api_usage_monthly matview を user+月で集計
 * - estimateCost: .env 単価で USD 概算 (表示用、純関数)
 * - refreshMonthlyMatview: matview を CONCURRENTLY 再構築 (Vercel Cron から呼ぶ)
 *
 * db はテスト容易性のため引数注入可 (デフォルトはシングルトン)。
 *
 * 関連: docs/_shared/analytics/001_analytics_SPEC.md §1.2, 002_analytics_PLAN.md
 */
import { sql } from 'drizzle-orm';
import { db as defaultDb } from '../db/client';
import { apiUsage } from '../db/schema';
import type { CostLogEntry, UsageSummary } from '../types/analytics';
import { openAiUnitPrices } from './unit-prices';

/** cost.ts が必要とする db の構造的最小インターフェース (DI + テスト容易性) */
export type CostDb = {
  insert: (table: typeof apiUsage) => {
    values: (row: Record<string, unknown>) => Promise<unknown>;
  };
  execute: (query: unknown) => Promise<unknown>;
};

/** drizzle ドライバ差 (neon-http は配列, node-postgres は {rows}) を吸収 */
function extractRows(res: unknown): Record<string, unknown>[] {
  if (Array.isArray(res)) return res as Record<string, unknown>[];
  if (res && typeof res === 'object' && 'rows' in res) {
    return (res as { rows: Record<string, unknown>[] }).rows ?? [];
  }
  return [];
}

/**
 * api_usage に 1 件 INSERT する。
 * - 入力不正 (service/endpoint 空, token 負) は reject (TypeError)
 * - DB / network エラーは retry 1 回 → なお失敗なら console.error + resolve (fail-soft)
 */
export async function logApiUsage(
  entry: CostLogEntry,
  database: CostDb = defaultDb as unknown as CostDb,
): Promise<void> {
  if (!entry.service || !entry.endpoint) {
    throw new TypeError('logApiUsage: service and endpoint must be non-empty');
  }
  if ((entry.inputTokens ?? 0) < 0 || (entry.outputTokens ?? 0) < 0) {
    throw new TypeError('logApiUsage: tokens must be >= 0');
  }

  const row = {
    userId: entry.userId ?? null,
    service: entry.service,
    endpoint: entry.endpoint,
    inputTokens: entry.inputTokens ?? 0,
    outputTokens: entry.outputTokens ?? 0,
    imageCount: entry.imageCount ?? 0,
    success: entry.success,
    latencyMs: entry.latencyMs ?? null,
  };

  try {
    await database.insert(apiUsage).values(row);
  } catch {
    // retry 1 回 (E-AN-001)
    try {
      await database.insert(apiUsage).values(row);
    } catch (err) {
      // fail-soft: ログのみ、本処理は継続させる
      console.error('logApiUsage failed (fail-soft):', err);
    }
  }
}

/**
 * gpt-4o-mini Vision 呼出 1 件の概算コスト (USD)。表示用。
 * - service が 'openai' 以外 → NaN + console.warn (単価未定義)
 * - COST_OPENAI_* env 未設定 → NaN + console.warn
 */
export function estimateCost(entry: CostLogEntry): number {
  if (entry.service !== 'openai') {
    console.warn(`estimateCost: 単価未定義の service "${entry.service}"`);
    return Number.NaN;
  }
  const p = openAiUnitPrices();
  if (
    Number.isNaN(p.inputPer1k) ||
    Number.isNaN(p.outputPer1k) ||
    Number.isNaN(p.imagePerCall)
  ) {
    console.warn('estimateCost: COST_OPENAI_* env が未設定です');
    return Number.NaN;
  }
  const input = ((entry.inputTokens ?? 0) / 1000) * p.inputPer1k;
  const output = ((entry.outputTokens ?? 0) / 1000) * p.outputPer1k;
  const image = (entry.imageCount ?? 0) * p.imagePerCall;
  return input + output + image;
}

/**
 * api_usage_monthly matview から user の当月利用を集計して返す。
 * matview は (user_id, year_month, service) 粒度のため、service 横断で合算する。
 */
export async function getMonthlyUsage(
  userId: string,
  yearMonth: string,
  database: CostDb = defaultDb as unknown as CostDb,
): Promise<UsageSummary> {
  const res = await database.execute(
    sql`SELECT service, call_count, input_tokens, output_tokens, image_count, estimated_cost_usd
        FROM api_usage_monthly
        WHERE user_id = ${userId} AND year_month = ${yearMonth}`,
  );
  const rows = extractRows(res);

  const summary: UsageSummary = {
    yearMonth,
    userId,
    service: 'all',
    callCount: 0,
    inputTokens: 0,
    outputTokens: 0,
    imageCount: 0,
    estimatedCostUsd: 0,
  };
  for (const r of rows) {
    summary.callCount += Number(r.call_count ?? 0);
    summary.inputTokens += Number(r.input_tokens ?? 0);
    summary.outputTokens += Number(r.output_tokens ?? 0);
    summary.imageCount += Number(r.image_count ?? 0);
    summary.estimatedCostUsd += Number(r.estimated_cost_usd ?? 0);
  }
  return summary;
}

/** api_usage_monthly matview を CONCURRENTLY 再構築 (Vercel Cron 日次)。 */
export async function refreshMonthlyMatview(
  database: CostDb = defaultDb as unknown as CostDb,
): Promise<void> {
  await database.execute(
    sql`REFRESH MATERIALIZED VIEW CONCURRENTLY api_usage_monthly`,
  );
}

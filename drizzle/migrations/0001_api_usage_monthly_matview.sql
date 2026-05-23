-- =============================================================================
-- 0001_api_usage_monthly_matview.sql
-- 関連: docs/_shared/db/001_db_SPEC.md §3.10
-- 説明: api_usage を月次集計する Materialized View。
--       Vercel Cron `/api/refresh-matview` が日次 REFRESH を実行 (vercel.json)。
-- =============================================================================

CREATE MATERIALIZED VIEW IF NOT EXISTS api_usage_monthly AS
SELECT
  date_trunc('month', created_at) AS year_month,
  service,
  user_id,
  count(*)::int AS call_count,
  sum(input_tokens)::int AS input_tokens,
  sum(output_tokens)::int AS output_tokens,
  sum(image_count)::int AS image_count
FROM api_usage
GROUP BY 1, 2, 3;

-- CONCURRENTLY REFRESH を可能にするための unique index
CREATE UNIQUE INDEX IF NOT EXISTS api_usage_monthly_uniq_idx
  ON api_usage_monthly (year_month, service, user_id);

-- クエリ最適化用 (新しい月から検索)
CREATE INDEX IF NOT EXISTS api_usage_monthly_year_month_idx
  ON api_usage_monthly (year_month DESC);

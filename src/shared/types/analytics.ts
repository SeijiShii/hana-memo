// 計測型 (Sentry + 自前 api_usage コストログ)
// 関連: docs/_shared/analytics/001_analytics_SPEC.md, docs/_shared/types/001_types_SPEC.md

export type CostLogEntry = {
  userId?: string | null;
  service: string; // 'openai' | 'r2' | 'neon' | 'clerk' 等
  endpoint: string;
  inputTokens?: number;
  outputTokens?: number;
  imageCount?: number;
  success: boolean;
  latencyMs?: number;
};

export type UsageSummary = {
  yearMonth: string; // 'YYYY-MM' format
  userId?: string | null;
  service: string;
  callCount: number;
  inputTokens: number;
  outputTokens: number;
  imageCount: number;
  estimatedCostUsd: number;
};

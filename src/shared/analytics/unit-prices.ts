/**
 * API 単価プロバイダ (.env の COST_* を型付きで提供)
 *
 * 値変動でテストが脆くならないよう、読み取りは関数経由 (呼び出し時に process.env を参照)。
 * テストは `vi.stubEnv` で固定値を注入する。
 *
 * 関連: docs/_shared/analytics/002_analytics_PLAN.md §1.1, .env.example COST_*
 */

/** env から数値を読む。未設定 / 空 / 非数値は NaN を返す (estimateCost 側で warn) */
function envNum(key: string): number {
  const raw = process.env[key];
  if (raw === undefined || raw === '') return Number.NaN;
  return Number(raw);
}

export type OpenAiUnitPrices = {
  /** 入力トークン 1000 件あたり USD */
  inputPer1k: number;
  /** 出力トークン 1000 件あたり USD */
  outputPer1k: number;
  /** 画像 1 枚 (1 call) あたり USD */
  imagePerCall: number;
};

/** gpt-4o-mini Vision の単価 (.env COST_OPENAI_GPT4O_MINI_*) */
export function openAiUnitPrices(): OpenAiUnitPrices {
  return {
    inputPer1k: envNum('COST_OPENAI_GPT4O_MINI_PER_1K_INPUT_TOKENS'),
    outputPer1k: envNum('COST_OPENAI_GPT4O_MINI_PER_1K_OUTPUT_TOKENS'),
    imagePerCall: envNum('COST_OPENAI_GPT4O_MINI_PER_IMAGE'),
  };
}

export type InfraUnitPrices = {
  /** R2 ストレージ GB/月あたり USD */
  r2PerGbMonth: number;
  /** Neon コンピュート時間あたり USD */
  neonPerComputeHour: number;
  /** Clerk MAU 超過分あたり USD */
  clerkPerMauOverage: number;
};

/** インフラ無料枠超過判定用の単価 (check-quota Cron が参照) */
export function infraUnitPrices(): InfraUnitPrices {
  return {
    r2PerGbMonth: envNum('COST_R2_PER_GB_PER_MONTH'),
    neonPerComputeHour: envNum('COST_NEON_PER_COMPUTE_HOUR'),
    clerkPerMauOverage: envNum('COST_CLERK_PER_MAU_OVERAGE'),
  };
}

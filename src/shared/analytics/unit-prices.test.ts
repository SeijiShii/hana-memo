/**
 * unit-prices.ts 単体テスト (.env COST_* 読み取り)
 */
import { describe, it, expect, afterEach, vi } from 'vitest';
import { openAiUnitPrices, infraUnitPrices } from './unit-prices';

afterEach(() => vi.unstubAllEnvs());

describe('openAiUnitPrices', () => {
  it('env 設定時は数値を返す', () => {
    vi.stubEnv('COST_OPENAI_GPT4O_MINI_PER_1K_INPUT_TOKENS', '0.00015');
    vi.stubEnv('COST_OPENAI_GPT4O_MINI_PER_1K_OUTPUT_TOKENS', '0.0006');
    vi.stubEnv('COST_OPENAI_GPT4O_MINI_PER_IMAGE', '0.001');
    expect(openAiUnitPrices()).toEqual({
      inputPer1k: 0.00015,
      outputPer1k: 0.0006,
      imagePerCall: 0.001,
    });
  });

  it('env 未設定 → NaN', () => {
    vi.unstubAllEnvs();
    const p = openAiUnitPrices();
    expect(p.inputPer1k).toBeNaN();
    expect(p.outputPer1k).toBeNaN();
    expect(p.imagePerCall).toBeNaN();
  });
});

describe('infraUnitPrices', () => {
  it('env 設定時は数値を返す', () => {
    vi.stubEnv('COST_R2_PER_GB_PER_MONTH', '0.015');
    vi.stubEnv('COST_NEON_PER_COMPUTE_HOUR', '0.16');
    vi.stubEnv('COST_CLERK_PER_MAU_OVERAGE', '0.02');
    expect(infraUnitPrices()).toEqual({
      r2PerGbMonth: 0.015,
      neonPerComputeHour: 0.16,
      clerkPerMauOverage: 0.02,
    });
  });

  it('env 未設定 → NaN', () => {
    vi.unstubAllEnvs();
    expect(infraUnitPrices().r2PerGbMonth).toBeNaN();
  });
});

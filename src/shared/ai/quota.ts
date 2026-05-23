/**
 * AI quota 判定 (純関数)
 * 関連: docs/_shared/ai/001_ai_SPEC.md §4.1, 003_ai_UNIT_TEST.md §1.6 (UT-AI-Q01〜Q04)
 */
import { QuotaExceededError } from './errors';

/** quota 残を判定する。 */
export function checkQuota(remaining: number): { ok: boolean; remaining: number } {
  return { ok: remaining > 0, remaining: Math.max(0, remaining) };
}

/** quota を 1 消費した後の残数を返す。残 0 で QuotaExceededError。 */
export function consumeQuota(remaining: number): number {
  if (remaining <= 0) {
    throw new QuotaExceededError();
  }
  return remaining - 1;
}

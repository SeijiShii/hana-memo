/**
 * api/check-quota.ts 単体テスト (予算超過判定 + 年月)
 */
import { describe, it, expect } from 'vitest';
import { evaluateQuotaAlert, currentYearMonth } from './check-quota';

describe('evaluateQuotaAlert', () => {
  it('予算の 80% 以上で alert + ⚠️ メッセージ', () => {
    const r = evaluateQuotaAlert({ costUsd: 25, budgetUsd: 30 });
    expect(r.alert).toBe(true);
    expect(r.message).toContain('⚠️');
    expect(r.ratio).toBeCloseTo(0.833, 2);
  });

  it('80% 未満は alert なし', () => {
    const r = evaluateQuotaAlert({ costUsd: 10, budgetUsd: 30 });
    expect(r.alert).toBe(false);
    expect(r.message).not.toContain('⚠️');
  });

  it('thresholdRatio をカスタムできる', () => {
    expect(evaluateQuotaAlert({ costUsd: 16, budgetUsd: 30, thresholdRatio: 0.5 }).alert).toBe(true);
  });

  it('budget 0 は除算回避で alert なし', () => {
    const r = evaluateQuotaAlert({ costUsd: 5, budgetUsd: 0 });
    expect(r.alert).toBe(false);
    expect(r.ratio).toBe(0);
  });
});

describe('currentYearMonth', () => {
  it('YYYY-MM 形式を返す', () => {
    expect(currentYearMonth(new Date('2026-05-24T12:00:00Z'))).toBe('2026-05');
  });
});

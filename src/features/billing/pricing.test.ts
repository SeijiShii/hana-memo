/**
 * pricing.ts + revenue.ts 単体テスト
 * 由来: 003_billing_UNIT_TEST.md §1.1 (CS01〜CS06) + §1.6 (ER03/ER05)
 */
import { describe, it, expect } from 'vitest';
import {
  validateQuantity,
  aiCreditsAmountJpy,
  aiCreditsGranted,
  validatePwywAmount,
  requireLinked,
} from './pricing';
import { InvalidAmountError } from './errors';
import { LinkRequiredError } from '../../shared/auth';
import { grossMargin, buildRevenueCsv, REVENUE_CSV_COLUMNS } from './revenue';

describe('AI クレジット価格', () => {
  it('UT-BL-CS01/CS02: qty 1-10 OK、金額/付与計算', () => {
    expect(validateQuantity(1)).toBe(1);
    expect(validateQuantity(10)).toBe(10);
    expect(aiCreditsAmountJpy(2)).toBe(200);
    expect(aiCreditsGranted(2)).toBe(40);
  });
  it('UT-BL-CS03: qty 11 / 0 / 小数 → InvalidAmountError', () => {
    expect(() => validateQuantity(11)).toThrow(InvalidAmountError);
    expect(() => validateQuantity(0)).toThrow(InvalidAmountError);
    expect(() => validateQuantity(1.5)).toThrow(InvalidAmountError);
  });
});

describe('PWYW 金額', () => {
  it('UT-BL-CS04: 100-10000 OK', () => {
    expect(validatePwywAmount(100)).toBe(100);
    expect(validatePwywAmount(500)).toBe(500);
    expect(validatePwywAmount(10000)).toBe(10000);
  });
  it('UT-BL-CS05: 50 / 10001 → InvalidAmountError', () => {
    expect(() => validatePwywAmount(50)).toThrow(InvalidAmountError);
    expect(() => validatePwywAmount(10001)).toThrow(InvalidAmountError);
  });
});

describe('requireLinked', () => {
  it('UT-BL-CS06: 匿名 (false) → LinkRequiredError', () => {
    expect(() => requireLinked(false)).toThrow(LinkRequiredError);
  });
  it('linked → throw しない', () => {
    expect(() => requireLinked(true)).not.toThrow();
  });
});

describe('revenue', () => {
  it('UT-BL-ER05: grossMargin = (net - cost) / net、net=0 は 0', () => {
    expect(grossMargin(1000, 200)).toBeCloseTo(0.8, 4);
    expect(grossMargin(0, 0)).toBe(0);
  });
  it('UT-BL-ER03: CSV 列順 + 行整形', () => {
    const csv = buildRevenueCsv([
      { date: '2026-04', paidUsers: 3, newSignups: 10, netRevenueJpy: 1000, externalApiCostJpy: 200 },
    ]);
    const [header, row] = csv.split('\n');
    expect(header).toBe(REVENUE_CSV_COLUMNS.join(','));
    expect(row).toBe('2026-04,3,10,1000,200,0.8000');
  });
});

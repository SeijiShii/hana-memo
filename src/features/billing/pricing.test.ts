/**
 * pricing.ts + revenue.ts 単体テスト
 * 由来: 003_billing_UNIT_TEST.md §1.1 (CS01〜CS06) + §1.6 (ER03/ER05)
 */
import { describe, it, expect } from 'vitest';
import { validateQuantity, aiCreditsAmountJpy, aiCreditsGranted } from './pricing';
import { InvalidAmountError } from './errors';
import { grossMargin, buildRevenueCsv, REVENUE_CSV_COLUMNS } from './revenue';

describe('AI クレジット価格', () => {
  it('UT-BL-CS01/CS02: qty 1 のみ OK、¥100 = 10 回付与 (revise_001)', () => {
    expect(validateQuantity(1)).toBe(1);
    expect(aiCreditsAmountJpy(1)).toBe(100);
    expect(aiCreditsGranted(1)).toBe(10);
  });
  it('UT-BL-CS03: qty 2 (上限超) / 0 / 小数 → InvalidAmountError (revise_001: 上限 ¥100)', () => {
    expect(() => validateQuantity(2)).toThrow(InvalidAmountError);
    expect(() => validateQuantity(0)).toThrow(InvalidAmountError);
    expect(() => validateQuantity(1.5)).toThrow(InvalidAmountError);
  });
});

describe('revenue', () => {
  it('UT-BL-ER05: grossMargin = (net - cost) / net、net=0 は 0', () => {
    expect(grossMargin(1000, 200)).toBeCloseTo(0.8, 4);
    expect(grossMargin(0, 0)).toBe(0);
  });
  it('UT-BL-ER03: CSV 列順 + 行整形', () => {
    const csv = buildRevenueCsv([
      {
        date: '2026-04',
        paidUsers: 3,
        newSignups: 10,
        netRevenueJpy: 1000,
        externalApiCostJpy: 200,
      },
    ]);
    const [header, row] = csv.split('\n');
    expect(header).toBe(REVENUE_CSV_COLUMNS.join(','));
    expect(row).toBe('2026-04,3,10,1000,200,0.8000');
  });
});

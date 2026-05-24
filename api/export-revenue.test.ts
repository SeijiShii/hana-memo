/**
 * export-revenue 単体テスト (月次収益集計 → CSV → 保存 → Slack 通知)
 * 由来: docs/billing/003_billing_UNIT_TEST.md §1.6 (UT-BL-ER01/ER02/ER06)
 */
import { describe, it, expect, vi } from 'vitest';
import { runExportRevenue, previousYearMonth } from './export-revenue';
import type { RevenueRow } from '../src/features/billing/revenue';

describe('previousYearMonth', () => {
  it('前月を YYYY-MM で返す', () => {
    expect(previousYearMonth(new Date('2026-05-15T00:00:00Z'))).toBe('2026-04');
  });
  it('年初は前年 12 月にロールオーバー', () => {
    expect(previousYearMonth(new Date('2026-01-10T00:00:00Z'))).toBe('2025-12');
  });
});

const rows: RevenueRow[] = [
  { date: '2026-04', paidUsers: 3, newSignups: 5, netRevenueJpy: 1500, externalApiCostJpy: 300 },
];

describe('runExportRevenue', () => {
  it('UT-BL-ER01: 集計あり → CSV を revenue/<ym>.csv に保存 + 通知', async () => {
    const saveCsv = vi.fn<(objectKey: string, csv: string) => Promise<void>>(async () => {});
    const notify = vi.fn<(text: string) => Promise<boolean>>(async () => true);
    const out = await runExportRevenue({
      yearMonth: '2026-04',
      fetchRows: async () => rows,
      saveCsv,
      notify,
    });
    expect(out).toMatchObject({ rowCount: 1, objectKey: 'revenue/2026-04.csv', notified: true });
    const [objectKey, csv] = saveCsv.mock.calls[0]!;
    expect(objectKey).toBe('revenue/2026-04.csv');
    expect(csv).toContain('date,paid_users,new_signups,net_revenue');
    expect(csv).toContain('2026-04,3,5,1500,300');
    expect(notify).toHaveBeenCalledOnce();
    expect(notify.mock.calls[0]![0]).toContain('1 行');
  });

  it('UT-BL-ER02: 件数 0 → ヘッダのみ CSV 保存 + 「収益なし」通知', async () => {
    const saveCsv = vi.fn<(objectKey: string, csv: string) => Promise<void>>(async () => {});
    const notify = vi.fn<(text: string) => Promise<boolean>>(async () => true);
    const out = await runExportRevenue({
      yearMonth: '2026-04',
      fetchRows: async () => [],
      saveCsv,
      notify,
    });
    expect(out.rowCount).toBe(0);
    const csv = saveCsv.mock.calls[0]![1];
    expect(csv).toBe('date,paid_users,new_signups,net_revenue,external_api_cost,gross_margin');
    expect(notify.mock.calls[0]![0]).toContain('収益なし');
  });

  it('UT-BL-ER06: Slack URL 未設定 (notify が false) でも完了する', async () => {
    const saveCsv = vi.fn<(objectKey: string, csv: string) => Promise<void>>(async () => {});
    const notify = vi.fn<(text: string) => Promise<boolean>>(async () => false); // notifySlack が console.warn + false
    const out = await runExportRevenue({
      yearMonth: '2026-04',
      fetchRows: async () => rows,
      saveCsv,
      notify,
    });
    expect(out.notified).toBe(false);
    expect(saveCsv).toHaveBeenCalledOnce(); // 保存は通知有無に関わらず実施
  });
});

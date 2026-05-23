/**
 * 月次収益集計 + CSV 生成 (純関数、UC5 / concept §4.6.4.1)
 * 関連: docs/billing/001_billing_SPEC.md §1 UC5, 003_billing_UNIT_TEST.md §1.6 (ER03/ER05)
 */

/** CSV カラム順 (仕様準拠、UT-BL-ER03) */
export const REVENUE_CSV_COLUMNS = [
  'date',
  'paid_users',
  'new_signups',
  'net_revenue',
  'external_api_cost',
  'gross_margin',
] as const;

export type RevenueRow = {
  date: string; // 'YYYY-MM'
  paidUsers: number;
  newSignups: number;
  netRevenueJpy: number;
  externalApiCostJpy: number;
};

/** 粗利率 = (net - cost) / net。net=0 は 0 (UT-BL-ER05)。 */
export function grossMargin(netRevenueJpy: number, externalApiCostJpy: number): number {
  if (netRevenueJpy === 0) return 0;
  return (netRevenueJpy - externalApiCostJpy) / netRevenueJpy;
}

/** 収益行を CSV 文字列に整形 (ヘッダ + 行)。 */
export function buildRevenueCsv(rows: RevenueRow[]): string {
  const header = REVENUE_CSV_COLUMNS.join(',');
  const lines = rows.map((r) =>
    [
      r.date,
      r.paidUsers,
      r.newSignups,
      r.netRevenueJpy,
      r.externalApiCostJpy,
      grossMargin(r.netRevenueJpy, r.externalApiCostJpy).toFixed(4),
    ].join(','),
  );
  return [header, ...lines].join('\n');
}

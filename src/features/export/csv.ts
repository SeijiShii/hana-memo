/**
 * CSV 生成 (純関数、UC2 + 撤退手順)
 * 関連: docs/export/001_export_SPEC.md §1 UC2, §4.2 (E-EX-005 UTF-8 BOM)
 */

/** Excel 互換のための UTF-8 BOM */
export const UTF8_BOM = '﻿';

/** discoveries CSV の標準カラム */
export const DISCOVERY_CSV_COLUMNS = [
  'id',
  'common_name',
  'scientific_name',
  'status',
  'captured_at',
  'season',
  'lat',
  'lng',
  'user_note',
] as const;

/** CSV フィールドのエスケープ (カンマ/引用符/改行を含む場合は "" で囲み、内部 " は ""). */
export function escapeCsvField(value: unknown): string {
  const s = value == null ? '' : String(value);
  if (/[",\n\r]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

/**
 * 行配列を CSV 文字列に変換する。
 * デフォルトで UTF-8 BOM を付加 (Excel の文字化け回避、E-EX-005)。
 */
export function toCsv(
  rows: Record<string, unknown>[],
  columns: readonly string[],
  opts: { bom?: boolean } = {},
): string {
  const header = columns.map(escapeCsvField).join(',');
  const lines = rows.map((row) => columns.map((c) => escapeCsvField(row[c])).join(','));
  const body = [header, ...lines].join('\n');
  return (opts.bom ?? true) ? UTF8_BOM + body : body;
}

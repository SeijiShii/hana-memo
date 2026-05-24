/**
 * export frontend API ラッパ + ブラウザダウンロードヘルパ
 *
 * - fetchExportRows: GET /api/export/discoveries → CSV 行
 * - buildDiscoveryCsv: tested core `toCsv` + DISCOVERY_CSV_COLUMNS で CSV 文字列を生成
 * - downloadBlob: Blob を <a download> でブラウザ保存 (PDF/CSV 共通)
 *
 * 実 PDF 生成 (jsPDF/html2canvas) と画像 ZIP (JSZip) は browser/canvas 依存のため Milestone C E2E。
 * 本モジュールは「データ取得 + CSV 整形 + ダウンロード起動」までを担う。
 *
 * 関連: docs/export/001_export_SPEC.md §1 UC1/UC2, 003_export_UNIT_TEST.md (E-EX-002/005)
 */
import { toCsv, DISCOVERY_CSV_COLUMNS } from './csv';
import { ExportError } from './errors';

export type DiscoveryCsvRow = {
  id: string;
  common_name: string;
  scientific_name: string;
  status: string;
  captured_at: string;
  season: string;
  lat: number | '';
  lng: number | '';
  user_note: string;
};

export type ExportApiOptions = {
  token: string;
  fetchFn?: typeof fetch;
};

const DISCOVERIES_ENDPOINT = '/api/export/discoveries';

/** エクスポート対象の discovery 行を取得する。 */
export async function fetchExportRows(
  opts: ExportApiOptions & { month?: string },
): Promise<DiscoveryCsvRow[]> {
  const fetchFn = opts.fetchFn ?? fetch;
  const qs = opts.month ? `?month=${encodeURIComponent(opts.month)}` : '';
  const res = await fetchFn(`${DISCOVERIES_ENDPOINT}${qs}`, {
    method: 'GET',
    headers: { authorization: `Bearer ${opts.token}` },
  });
  if (!res.ok) {
    throw new ExportError(`export fetch failed: ${res.status}`);
  }
  const body = (await res.json()) as { rows: DiscoveryCsvRow[] };
  return body.rows;
}

/** discovery 行を CSV 文字列に整形する (UTF-8 BOM 付き、E-EX-005)。 */
export function buildDiscoveryCsv(rows: DiscoveryCsvRow[]): string {
  return toCsv(rows as unknown as Record<string, unknown>[], DISCOVERY_CSV_COLUMNS);
}

/** Blob をブラウザでダウンロードさせる (テスト時は createObjectURL を stub)。 */
export function downloadBlob(filename: string, blob: Blob): void {
  if (typeof document === 'undefined' || typeof URL.createObjectURL !== 'function') {
    throw new ExportError('downloadBlob requires a browser environment');
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/** テキスト (CSV 等) を Blob 化してダウンロードする。 */
export function downloadTextFile(filename: string, content: string, mime = 'text/csv'): void {
  downloadBlob(filename, new Blob([content], { type: `${mime};charset=utf-8` }));
}

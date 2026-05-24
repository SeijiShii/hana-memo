/**
 * エクスポート React hook — データ取得 + CSV/PDF 生成 + ダウンロード起動を束ねる。
 *
 * - exportCsv: fetchExportRows → buildDiscoveryCsv → downloadTextFile
 * - exportPdf: requirePdfUnlocked + validatePdfCount ガード後、注入された renderPdf(rows) で
 *   Blob を得て download。実 jsPDF/html2canvas レンダラは app 層 / E2E で注入する (Milestone C)。
 *
 * 関連: docs/export/001_export_SPEC.md §1 UC1/UC2/§4, 003_export_UNIT_TEST.md (E-EX-001/003/004)
 */
import { useCallback, useState } from 'react';
import { requirePdfUnlocked, validatePdfCount, validateMonthRange } from './validation';
import { pdfFilename } from './filename';
import {
  fetchExportRows,
  buildDiscoveryCsv,
  downloadTextFile,
  downloadBlob,
  type ExportApiOptions,
  type DiscoveryCsvRow,
} from './exportApi';

export type UseExportOptions = ExportApiOptions & {
  /** billing usePdfUnlocked の値 (PDF は unlock 必須、E-EX-004)。 */
  pdfUnlocked: boolean;
};

/** PDF レンダラ (実体は jsPDF/html2canvas、テスト/Milestone C で注入)。 */
export type PdfRenderer = (rows: DiscoveryCsvRow[]) => Promise<Blob>;

export function useExport(opts: UseExportOptions): {
  exportCsv: (params?: { month?: string }) => Promise<void>;
  exportPdf: (renderPdf: PdfRenderer, params?: { month?: string; period?: string }) => Promise<void>;
  exporting: boolean;
  error: Error | null;
} {
  const { token, fetchFn, pdfUnlocked } = opts;
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const exportCsv = useCallback(
    async (params?: { month?: string }) => {
      setExporting(true);
      setError(null);
      try {
        validateMonthRange(params?.month, params?.month);
        const rows = await fetchExportRows({ token, fetchFn, month: params?.month });
        const csv = buildDiscoveryCsv(rows);
        downloadTextFile(`hanamemo_discoveries_${params?.month ?? 'all'}.csv`, csv);
      } catch (err) {
        const e = err instanceof Error ? err : new Error(String(err));
        setError(e);
        throw e;
      } finally {
        setExporting(false);
      }
    },
    [token, fetchFn],
  );

  const exportPdf = useCallback(
    async (renderPdf: PdfRenderer, params?: { month?: string; period?: string }) => {
      setExporting(true);
      setError(null);
      try {
        requirePdfUnlocked(pdfUnlocked); // E-EX-004 (unlock 前に fetch しない)
        const rows = await fetchExportRows({ token, fetchFn, month: params?.month });
        validatePdfCount(rows.length); // E-EX-001 (>200) / E-EX-003 (0)
        const blob = await renderPdf(rows);
        downloadBlob(pdfFilename(params?.period ?? params?.month ?? 'all', rows.length), blob);
      } catch (err) {
        const e = err instanceof Error ? err : new Error(String(err));
        setError(e);
        throw e;
      } finally {
        setExporting(false);
      }
    },
    [token, fetchFn, pdfUnlocked],
  );

  return { exportCsv, exportPdf, exporting, error };
}

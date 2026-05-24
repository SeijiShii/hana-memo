// export feature barrel (コア + app bootstrap glue)
// 関連: docs/export/001_export_SPEC.md
// CSV エクスポートは end-to-end wiring 済。実 PDF 生成 (jsPDF) / 画像 ZIP (JSZip) は Milestone C E2E
export { ExportError } from './errors';
export { UTF8_BOM, DISCOVERY_CSV_COLUMNS, escapeCsvField, toCsv } from './csv';
export {
  PDF_MAX_COUNT,
  validateMonthRange,
  validatePdfCount,
  requirePdfUnlocked,
} from './validation';
export { pdfFilename, csvZipFilename, imagesZipFilename } from './filename';
export {
  fetchExportRows,
  buildDiscoveryCsv,
  downloadBlob,
  downloadTextFile,
  type ExportApiOptions,
  type DiscoveryCsvRow,
} from './exportApi';
export { useExport, type UseExportOptions, type PdfRenderer } from './hooks';

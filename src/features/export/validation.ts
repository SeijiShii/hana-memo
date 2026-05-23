/**
 * export 入力検証 (純関数)
 * 関連: docs/export/001_export_SPEC.md §4.1/§4.2 (E-EX-001/003/004)
 */
import { ExportError } from './errors';

/** PDF はクライアントメモリ制約で 200 件まで */
export const PDF_MAX_COUNT = 200;

/** 月範囲検証 ('YYYY-MM')。start>end は ExportError。両方未指定は全期間で OK。 */
export function validateMonthRange(start?: string, end?: string): void {
  if (start && end && start > end) {
    throw new ExportError(`invalid month range: ${start} > ${end}`);
  }
}

/** PDF 対象件数検証。0 件 (E-EX-003) / 200 件超 (E-EX-001) は ExportError。 */
export function validatePdfCount(count: number): void {
  if (count <= 0) {
    throw new ExportError('no discoveries to export');
  }
  if (count > PDF_MAX_COUNT) {
    throw new ExportError(`too many items: ${count} (max ${PDF_MAX_COUNT})`);
  }
}

/** PDF unlock ガード (未 unlock は ExportError、E-EX-004)。 */
export function requirePdfUnlocked(unlocked: boolean): void {
  if (!unlocked) {
    throw new ExportError('PDF export requires unlock (PWYW)');
  }
}

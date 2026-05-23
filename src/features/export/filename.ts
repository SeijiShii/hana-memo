/**
 * エクスポートファイル名規約 (純関数)
 * 関連: docs/export/001_export_SPEC.md §1 UC1/UC2/UC4
 */

/** 図鑑 PDF: `hanamemo_{period}_{count}件.pdf` */
export function pdfFilename(period: string, count: number): string {
  return `hanamemo_${period}_${count}件.pdf`;
}

/** 全データ ZIP: `hanamemo_export_{userId 先頭 8}_{YYYYMMDD}.zip` */
export function csvZipFilename(userId: string, yyyymmdd: string): string {
  return `hanamemo_export_${userId.slice(0, 8)}_${yyyymmdd}.zip`;
}

/** 画像 ZIP: `hanamemo_images_{YYYYMMDD}.zip` */
export function imagesZipFilename(yyyymmdd: string): string {
  return `hanamemo_images_${yyyymmdd}.zip`;
}

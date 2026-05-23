/**
 * export 例外型
 * 関連: docs/export/001_export_SPEC.md §4
 */
export class ExportError extends Error {
  constructor(public readonly reason: string) {
    super(`Export: ${reason}`);
    this.name = 'ExportError';
  }
}

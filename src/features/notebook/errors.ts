/**
 * notebook 例外型
 * 関連: docs/notebook/001_notebook_SPEC.md §4
 */
export class NotebookError extends Error {
  constructor(public readonly reason: string) {
    super(`Notebook: ${reason}`);
    this.name = 'NotebookError';
  }
}

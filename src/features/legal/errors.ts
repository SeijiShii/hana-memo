/**
 * legal (同意) 例外型
 * 関連: docs/legal/001_legal_SPEC.md §4, 003_legal_UNIT_TEST.md
 */

/** 同意レコードの入力不正 (doc_version null / 形式不正 等、E-LE 系) */
export class ConsentError extends Error {
  constructor(public readonly reason: string) {
    super(`Consent: ${reason}`);
    this.name = 'ConsentError';
  }
}

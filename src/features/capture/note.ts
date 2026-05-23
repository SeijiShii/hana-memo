/**
 * 補助メモ整形 (純関数)
 * 関連: docs/capture/001_capture_SPEC.md §4.1, 003_capture_UNIT_TEST.md (UT-CA-E03)
 */

/** 補助メモの最大長 (IdentifyInput.userNote) */
export const MAX_USER_NOTE = 200;

/** 補助メモを整形 (trim + 200 文字 cap、空は undefined)。 */
export function sanitizeUserNote(note: string | null | undefined): string | undefined {
  if (!note) return undefined;
  const trimmed = note.trim();
  if (trimmed === '') return undefined;
  return trimmed.slice(0, MAX_USER_NOTE);
}

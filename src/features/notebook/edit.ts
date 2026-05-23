/**
 * discovery 編集ロジック (純関数、UC4)
 * 関連: docs/notebook/001_notebook_SPEC.md §3/§4.1
 */
import type { EditField } from '../../shared/types/domain';
import { NotebookError } from './errors';
import type { NotebookDiscovery } from './types';

export const MAX_COMMON_NAME = 100;
export const MAX_USER_NOTE = 500;

/** common_name を整形 (trim + 100、空は undefined)。 */
export function sanitizeCommonName(name: string | null | undefined): string | undefined {
  if (!name) return undefined;
  const t = name.trim();
  return t === '' ? undefined : t.slice(0, MAX_COMMON_NAME);
}

/** user_note を整形 (trim + 500、空は undefined)。 */
export function sanitizeNoteField(note: string | null | undefined): string | undefined {
  if (!note) return undefined;
  const t = note.trim();
  return t === '' ? undefined : t.slice(0, MAX_USER_NOTE);
}

/** 緯度経度の範囲検証 (-90..90 / -180..180)。範囲外は NotebookError。 */
export function validateLocation(lat: number, lng: number): void {
  if (!Number.isFinite(lat) || lat < -90 || lat > 90) {
    throw new NotebookError(`invalid latitude: ${lat}`);
  }
  if (!Number.isFinite(lng) || lng < -180 || lng > 180) {
    throw new NotebookError(`invalid longitude: ${lng}`);
  }
}

/** 表示名を解決 (user 編集値 > AI 値 > original > '不明')。 */
export function resolveDisplayName(d: NotebookDiscovery): string {
  return d.userOverriddenName || d.commonName || d.originalCommonName || '不明';
}

export type EditRecord = {
  discoveryId: string;
  userId: string;
  fieldName: EditField;
  beforeValue: string | null;
  afterValue: string | null;
};

/** discovery_edits の append-only レコードを構築 (audit ログ)。 */
export function buildEditRecord(
  discoveryId: string,
  userId: string,
  fieldName: EditField,
  beforeValue: string | null,
  afterValue: string | null,
): EditRecord {
  if (!discoveryId || !userId) {
    throw new NotebookError('discoveryId and userId are required');
  }
  return { discoveryId, userId, fieldName, beforeValue, afterValue };
}

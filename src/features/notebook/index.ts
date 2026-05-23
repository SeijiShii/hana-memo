// notebook feature barrel (UI 非依存コア)
// 関連: docs/notebook/001_notebook_SPEC.md
// 4 モード React view / 詳細編集 UI / コラージュ canvas / OG image / Realtime は app bootstrap フェーズで追加
export { NotebookError } from './errors';
export type { NotebookDiscovery } from './types';
export {
  RADIUS_KM_MIN,
  RADIUS_KM_MAX,
  clampRadiusKm,
  matchesFilter,
  filterDiscoveries,
  type DiscoveryFilter,
} from './filter';
export {
  MAX_COMMON_NAME,
  MAX_USER_NOTE,
  sanitizeCommonName,
  sanitizeNoteField,
  validateLocation,
  resolveDisplayName,
  buildEditRecord,
  type EditRecord,
} from './edit';
export { sortByCapturedAtDesc, groupBySpecies } from './grouping';

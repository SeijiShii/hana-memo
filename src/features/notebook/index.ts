// notebook feature barrel (コア + app bootstrap glue)
// 関連: docs/notebook/001_notebook_SPEC.md
// データ IO は api/notebook/ (Vercel Function)、hooks は useNotebook/useDiscoveryEdit。
// 4 モード view / コラージュ canvas / OG image は Milestone C (presentation/E2E)
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
export {
  fetchDiscoveries,
  updateDiscovery,
  softDeleteDiscovery,
  type NotebookApiOptions,
  type NotebookPage,
  type EditValue,
} from './notebookApi';
export {
  useNotebook,
  useDiscoveryEdit,
  type UseNotebookOptions,
  type UseNotebookResult,
  type UseDiscoveryEditOptions,
} from './hooks';

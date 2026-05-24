// notebook feature barrel (コア + app bootstrap glue)
// 関連: docs/notebook/001_notebook_SPEC.md
// データ IO は api/notebook/ (Vercel Function)、hooks は useNotebook/useDiscoveryEdit。
// 4 モード view / 図鑑画面は presentation 層 (pages/NotebookPage + components/*View)。
// コラージュ canvas / OG image は別 Milestone。
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
  // pagination ページ型。presentation の NotebookPage コンポーネントと名前衝突するため別名で公開。
  type NotebookPage as NotebookPageData,
  type EditValue,
} from './notebookApi';
export {
  useNotebook,
  useDiscoveryEdit,
  type UseNotebookOptions,
  type UseNotebookResult,
  type UseDiscoveryEditOptions,
} from './hooks';
export { TimelineView, type TimelineViewProps } from './components/TimelineView';
export { CalendarView, type CalendarViewProps } from './components/CalendarView';
export {
  MapView,
  discoveriesWithCoords,
  type MapViewProps,
  type DiscoveryWithCoords,
} from './components/MapView';
export { FigureView, type FigureViewProps } from './components/FigureView';
export { NotebookPage, type NotebookPageProps, type NotebookViewMode } from './pages/NotebookPage';

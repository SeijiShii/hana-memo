/**
 * discovery のソート・グルーピング (純関数、UC1/UC2 図鑑)
 * 関連: docs/notebook/001_notebook_SPEC.md §1 UC1/UC2
 */
import type { NotebookDiscovery } from './types';

/** captured_at 降順 (最新が先頭、タイムライン default)。非破壊。 */
export function sortByCapturedAtDesc(list: NotebookDiscovery[]): NotebookDiscovery[] {
  return [...list].sort(
    (a, b) => new Date(b.capturedAt).getTime() - new Date(a.capturedAt).getTime(),
  );
}

/** scientific_name 別にグルーピング (図鑑モード)。null は '__unknown__' に集約。 */
export function groupBySpecies(list: NotebookDiscovery[]): Record<string, NotebookDiscovery[]> {
  const groups: Record<string, NotebookDiscovery[]> = {};
  for (const d of list) {
    const key = d.scientificName ?? '__unknown__';
    (groups[key] ??= []).push(d);
  }
  return groups;
}

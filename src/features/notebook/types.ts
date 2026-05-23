/**
 * notebook が扱う discovery の構造的サブセット (表示・フィルタ・編集用)
 * 関連: docs/notebook/001_notebook_SPEC.md §3
 */
import type { DiscoveryStatus, Season } from '../../shared/types/domain';

export type NotebookDiscovery = {
  id: string;
  commonName: string | null;
  originalCommonName?: string | null;
  userOverriddenName?: string | null;
  scientificName: string | null;
  userNote?: string | null;
  status: DiscoveryStatus;
  capturedAt: string; // ISO 8601
  season: Season;
  location?: { lat: number; lng: number } | null;
};

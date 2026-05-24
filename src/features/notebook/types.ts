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
  /**
   * 紐づく R2 画像の objectKey (images.r2_object_key)。画像未添付なら null。
   * サムネ表示はこの key を /api/storage/signed-url に渡して署名付き URL を引く
   * (per-card 署名取得はアプリ層 resolveThumbnail の責務)。
   */
  imageObjectKey?: string | null;
};

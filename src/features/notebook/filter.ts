/**
 * discovery フィルタ (純関数、UC3)
 * 関連: docs/notebook/001_notebook_SPEC.md §1 UC3, §4.1
 */
import type { DiscoveryStatus, Season } from '../../shared/types/domain';
import { haversineDistance } from '../../shared/helpers/location';
import type { NotebookDiscovery } from './types';

export const RADIUS_KM_MIN = 0.1;
export const RADIUS_KM_MAX = 100;

/** 場所円フィルタの半径を 0.1〜100km に clamp。 */
export function clampRadiusKm(km: number): number {
  return Math.min(RADIUS_KM_MAX, Math.max(RADIUS_KM_MIN, km));
}

export type DiscoveryFilter = {
  season?: Season;
  /** 'YYYY-MM' */
  month?: string;
  status?: DiscoveryStatus;
  circle?: { center: { lat: number; lng: number }; radiusKm: number };
  keyword?: string;
};

/** 単一 discovery がフィルタにマッチするか (全条件 AND)。 */
export function matchesFilter(d: NotebookDiscovery, filter: DiscoveryFilter): boolean {
  if (filter.season && d.season !== filter.season) return false;
  if (filter.month && d.capturedAt.slice(0, 7) !== filter.month) return false;
  if (filter.status && d.status !== filter.status) return false;

  if (filter.circle) {
    if (!d.location) return false;
    const radiusM = clampRadiusKm(filter.circle.radiusKm) * 1000;
    if (haversineDistance(filter.circle.center, d.location) > radiusM) return false;
  }

  if (filter.keyword) {
    const kw = filter.keyword.toLowerCase();
    const haystack = [d.commonName, d.scientificName, d.userNote, d.userOverriddenName]
      .filter((s): s is string => typeof s === 'string')
      .join('\n')
      .toLowerCase();
    if (!haystack.includes(kw)) return false;
  }

  return true;
}

/** discovery 配列をフィルタする。 */
export function filterDiscoveries(
  list: NotebookDiscovery[],
  filter: DiscoveryFilter,
): NotebookDiscovery[] {
  return list.filter((d) => matchesFilter(d, filter));
}

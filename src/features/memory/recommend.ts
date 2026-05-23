/**
 * 季節レコメンド「去年の今頃に見た花」(純関数、UC1/UC2)
 *
 * 前年の同期間 (±15 日) に identified した discovery を最大 5 件返す。
 * 実 DB SELECT / localStorage キャッシュ / React バッジ・カルーセルは app bootstrap で wiring。
 *
 * 関連: docs/memory/001_memory_SPEC.md §1, _shared/helpers/date.ts
 */
import { addDays, parseISO, formatDate } from '../../shared/helpers/date';
import type { DiscoveryStatus, Season } from '../../shared/types/domain';

/** 前後ウィンドウ (±15 日) */
export const MEMORY_WINDOW_DAYS = 15;
/** カルーセル最大件数 */
export const MEMORY_MAX_ITEMS = 5;

export type MemoryDiscovery = {
  id: string;
  commonName: string | null;
  status: DiscoveryStatus;
  capturedAt: string; // ISO 8601
  season: Season;
  location?: { lat: number; lng: number } | null;
};

/** 前年同日 ±windowDays の日付範囲を返す。 */
export function lastYearWindow(
  today: Date,
  windowDays = MEMORY_WINDOW_DAYS,
): { start: Date; end: Date } {
  const lastYear = new Date(today.getTime());
  lastYear.setFullYear(lastYear.getFullYear() - 1);
  return { start: addDays(lastYear, -windowDays), end: addDays(lastYear, windowDays) };
}

/**
 * 前年同期間の identified discovery を最新順に最大 max 件選定する。
 * 0 件なら空配列 (バッジ非表示、E-ME-002/003)。
 */
export function selectLastYearMemories(
  discoveries: MemoryDiscovery[],
  today: Date,
  opts: { windowDays?: number; max?: number } = {},
): MemoryDiscovery[] {
  const windowDays = opts.windowDays ?? MEMORY_WINDOW_DAYS;
  const max = opts.max ?? MEMORY_MAX_ITEMS;
  const { start, end } = lastYearWindow(today, windowDays);
  const startMs = start.getTime();
  const endMs = end.getTime();

  return discoveries
    .filter((d) => d.status === 'identified')
    .filter((d) => {
      const t = parseISO(d.capturedAt).getTime();
      return t >= startMs && t <= endMs;
    })
    .sort((a, b) => parseISO(b.capturedAt).getTime() - parseISO(a.capturedAt).getTime())
    .slice(0, max);
}

/** バッジ表示すべきか (1 件以上)。 */
export function hasMemories(memories: MemoryDiscovery[]): boolean {
  return memories.length > 0;
}

/** 日次キャッシュキー (1 日 1 回再計算、TTL 24h)。 */
export function memoryCacheKey(today: Date): string {
  return `hanamemo_memory_${formatDate(today, 'yyyy-MM-dd')}`;
}

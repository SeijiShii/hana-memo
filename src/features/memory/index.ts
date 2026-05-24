// memory feature barrel (コア + app bootstrap glue)
// 関連: docs/memory/001_memory_SPEC.md
// データ層 (recommend api + localStorage cache + useMemories) + presentation 層 (バッジ/カルーセル UI) wiring 済。
export {
  MEMORY_WINDOW_DAYS,
  MEMORY_MAX_ITEMS,
  lastYearWindow,
  selectLastYearMemories,
  hasMemories,
  memoryCacheKey,
  type MemoryDiscovery,
} from './recommend';
export {
  fetchMemories,
  readMemoryCache,
  writeMemoryCache,
  type MemoryApiOptions,
} from './memoryApi';
export { useMemories, type UseMemoriesOptions } from './hooks';
export { MemoryCard, type MemoryCardProps } from './components/MemoryCard';
export {
  MemorySection,
  MEMORY_SECTION_ANCHOR_ID,
  type MemorySectionProps,
} from './components/MemorySection';
export { MemoryBadge, MEMORY_BADGE_MAX, type MemoryBadgeProps } from './components/MemoryBadge';

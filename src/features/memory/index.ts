// memory feature barrel (コア + app bootstrap glue)
// 関連: docs/memory/001_memory_SPEC.md
// データ層 (recommend api + localStorage cache + useMemories) wiring 済。バッジ/カルーセル UI は Milestone C
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

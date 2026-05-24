/**
 * 季節レコメンド React hook — 「去年の今頃」をキャッシュ優先で取得する。
 *
 * 当日 localStorage キャッシュ hit → 即返却。miss → fetch → キャッシュ書込。
 * fetch 失敗は silent fail (E-ME-001): memories=[] でバッジ非表示にし、ページは壊さない。
 *
 * 関連: docs/memory/001_memory_SPEC.md §1 UC1/UC2, 003_memory_UNIT_TEST.md (E-ME-001/002/003)
 */
import { useEffect, useRef, useState } from 'react';
import { hasMemories, type MemoryDiscovery } from './recommend';
import {
  fetchMemories,
  readMemoryCache,
  writeMemoryCache,
  type MemoryApiOptions,
} from './memoryApi';

export type UseMemoriesOptions = MemoryApiOptions & {
  /** 基準日 (テスト注入、既定 now)。 */
  now?: Date;
};

/** 「去年の今頃」レコメンドを取得する (キャッシュ優先 + silent fail)。 */
export function useMemories(opts: UseMemoriesOptions): {
  memories: MemoryDiscovery[];
  show: boolean;
  loading: boolean;
} {
  const { token, fetchFn, now } = opts;
  const [memories, setMemories] = useState<MemoryDiscovery[]>([]);
  const [loading, setLoading] = useState(true);
  const fetchFnRef = useRef(fetchFn);
  fetchFnRef.current = fetchFn;

  useEffect(() => {
    let active = true;
    const today = now ?? new Date();
    const cached = readMemoryCache(today);
    if (cached) {
      setMemories(cached);
      setLoading(false);
      return;
    }
    (async () => {
      try {
        const fetched = await fetchMemories({ token, fetchFn: fetchFnRef.current });
        if (!active) return;
        writeMemoryCache(today, fetched);
        setMemories(fetched);
      } catch {
        if (!active) return;
        setMemories([]); // E-ME-001 silent fail
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
    // token / 基準日 (日付文字列) 変化時のみ再取得。
  }, [token, now?.toDateString()]);

  return { memories, show: hasMemories(memories), loading };
}

/**
 * 発見ノート React hooks — list API + tested core (filter/grouping/edit) を束ねる。
 *
 * - useNotebook: page 取得 (cursor) を蓄積し、filterDiscoveries + sortByCapturedAtDesc を適用。
 *   4 モード view (timeline/calendar/map/figure) は本 hook の discoveries / groups を描画するだけ。
 * - useDiscoveryEdit: updateDiscovery / softDeleteDiscovery を呼び、成功後に onMutated を発火。
 *
 * 関連: docs/notebook/001_notebook_SPEC.md §1 UC3/UC4, 003_notebook_UNIT_TEST.md §1.1/§1.2
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { filterDiscoveries, type DiscoveryFilter } from './filter';
import { sortByCapturedAtDesc, groupBySpecies } from './grouping';
import { resolveDisplayName } from './edit';
import {
  fetchDiscoveries,
  updateDiscovery,
  softDeleteDiscovery,
  type NotebookApiOptions,
  type EditValue,
} from './notebookApi';
import type { NotebookDiscovery } from './types';

export type UseNotebookOptions = NotebookApiOptions & {
  filter?: DiscoveryFilter;
  pageSize?: number;
};

export type UseNotebookResult = {
  /** filter + sort 適用後の discovery 一覧。 */
  discoveries: NotebookDiscovery[];
  /** 図鑑モード用の scientificName グループ。 */
  groups: Record<string, NotebookDiscovery[]>;
  loading: boolean;
  error: Error | null;
  hasMore: boolean;
  /** 次ページを取得して蓄積する (無限スクロール、UT-NB-D02)。 */
  loadMore: () => Promise<void>;
  /** 先頭から取り直す。 */
  refresh: () => Promise<void>;
};

/** discovery 一覧を取得・フィルタ・グルーピングする。 */
export function useNotebook(opts: UseNotebookOptions): UseNotebookResult {
  const { token, fetchFn, filter, pageSize } = opts;
  const [raw, setRaw] = useState<NotebookDiscovery[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const fetchFnRef = useRef(fetchFn);
  fetchFnRef.current = fetchFn;

  const load = useCallback(
    async (reset: boolean) => {
      setLoading(true);
      try {
        const page = await fetchDiscoveries({
          token,
          fetchFn: fetchFnRef.current,
          cursor: reset ? null : cursor,
          limit: pageSize,
        });
        setRaw((prev) => (reset ? page.items : [...prev, ...page.items]));
        setCursor(page.nextCursor);
        setHasMore(page.nextCursor !== null);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err : new Error(String(err)));
      } finally {
        setLoading(false);
      }
    },
    [token, cursor, pageSize],
  );

  const refresh = useCallback(async () => {
    setCursor(null);
    await load(true);
  }, [load]);

  const loadMore = useCallback(async () => {
    if (!hasMore || loading) return;
    await load(false);
  }, [hasMore, loading, load]);

  // 初回 mount + token 変化時に先頭から取得。filter は client 側適用のため依存に含めない。
  // load は cursor 変化で再生成されるが、初期ロードは token をトリガにする。
  const loadRef = useRef(load);
  loadRef.current = load;
  useEffect(() => {
    void loadRef.current(true);
  }, [token]);

  const filtered = filter ? filterDiscoveries(raw, filter) : raw;
  const discoveries = sortByCapturedAtDesc(filtered);
  return {
    discoveries,
    groups: groupBySpecies(discoveries),
    loading,
    error,
    hasMore,
    loadMore,
    refresh,
  };
}

export type UseDiscoveryEditOptions = NotebookApiOptions & {
  /** 編集 / 削除成功後に発火 (一覧再取得など)。 */
  onMutated?: () => void;
};

/** discovery の編集 / 削除を行う hook。 */
export function useDiscoveryEdit(opts: UseDiscoveryEditOptions): {
  edit: (discoveryId: string, value: EditValue) => Promise<void>;
  remove: (discoveryId: string) => Promise<void>;
  saving: boolean;
  error: Error | null;
} {
  const { token, fetchFn, onMutated } = opts;
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const onMutatedRef = useRef(onMutated);
  onMutatedRef.current = onMutated;

  const run = useCallback(async (fn: () => Promise<void>) => {
    setSaving(true);
    try {
      await fn();
      setError(null);
      onMutatedRef.current?.();
    } catch (err) {
      const e = err instanceof Error ? err : new Error(String(err));
      setError(e);
      throw e;
    } finally {
      setSaving(false);
    }
  }, []);

  const edit = useCallback(
    (discoveryId: string, value: EditValue) =>
      run(() => updateDiscovery(discoveryId, value, { token, fetchFn })),
    [run, token, fetchFn],
  );
  const remove = useCallback(
    (discoveryId: string) => run(() => softDeleteDiscovery(discoveryId, { token, fetchFn })),
    [run, token, fetchFn],
  );

  return { edit, remove, saving, error };
}

/** 表示名を解決する re-export (view が import しやすいように)。 */
export { resolveDisplayName };

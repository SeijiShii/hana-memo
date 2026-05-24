/**
 * memory frontend API ラッパ + localStorage 日次キャッシュ
 *
 * - fetchMemories: GET /api/memory/recommend → MemoryDiscovery[]
 * - read/writeMemoryCache: memoryCacheKey (日付込み) で 1 日 1 回再計算 (TTL 実質 24h)
 *
 * E-ME-001 (DB silent fail) は呼び出し側 (useMemories) が catch して空表示にする。
 *
 * 関連: docs/memory/001_memory_SPEC.md §1, 003_memory_UNIT_TEST.md
 */
import { memoryCacheKey, type MemoryDiscovery } from './recommend';

export type MemoryApiOptions = {
  token: string;
  fetchFn?: typeof fetch;
};

const RECOMMEND_ENDPOINT = '/api/memory/recommend';

/** 「去年の今頃」レコメンドを取得する。失敗は throw (hook 側で silent fail)。 */
export async function fetchMemories(opts: MemoryApiOptions): Promise<MemoryDiscovery[]> {
  const fetchFn = opts.fetchFn ?? fetch;
  const res = await fetchFn(RECOMMEND_ENDPOINT, {
    method: 'GET',
    headers: { authorization: `Bearer ${opts.token}` },
  });
  if (!res.ok) {
    throw new Error(`memory recommend failed: ${res.status}`);
  }
  const body = (await res.json()) as { memories: MemoryDiscovery[] };
  return body.memories;
}

function storage(): Storage | null {
  try {
    return typeof localStorage !== 'undefined' ? localStorage : null;
  } catch {
    return null; // SSR / プライベートモード等
  }
}

/** 当日キャッシュを読む (なければ null)。 */
export function readMemoryCache(today: Date): MemoryDiscovery[] | null {
  const store = storage();
  if (!store) return null;
  const raw = store.getItem(memoryCacheKey(today));
  if (!raw) return null;
  try {
    return JSON.parse(raw) as MemoryDiscovery[];
  } catch {
    return null;
  }
}

/** 当日キャッシュに書く (古い日付キーは自然に miss するので掃除は任意)。 */
export function writeMemoryCache(today: Date, memories: MemoryDiscovery[]): void {
  const store = storage();
  if (!store) return;
  try {
    store.setItem(memoryCacheKey(today), JSON.stringify(memories));
  } catch {
    // quota 超過等は無視 (キャッシュは best-effort)
  }
}

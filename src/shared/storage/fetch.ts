/**
 * R2 署名付き URL 取得 (frontend) — single / batch + 自動 refetch React hook
 *
 * - `getSignedUrl` / `getSignedUrls`: `POST /api/storage/signed-url` を叩く
 * - `useSignedUrl`: mount で URL を取得し、TTL (60 分) 失効前に 55 分間隔で refetch、unmount で cleanup
 *
 * 関連: docs/_shared/storage/001_storage_SPEC.md §1.2, 003_storage_UNIT_TEST.md §1.3 (UT-ST-F01〜F06/E02)
 */
import { useEffect, useRef, useState } from 'react';

const SIGNED_URL_ENDPOINT = '/api/storage/signed-url';

/** GET presigned URL の TTL (60 分) より前に refetch する間隔。 */
export const SIGNED_URL_REFETCH_MS = 55 * 60 * 1000;

export type SignedUrlOptions = {
  token: string;
  expiresIn?: number;
  fetchFn?: typeof fetch;
  endpoint?: string;
};

/** 単一 objectKey の署名付き URL を取得する。 */
export async function getSignedUrl(objectKey: string, opts: SignedUrlOptions): Promise<string> {
  const fetchFn = opts.fetchFn ?? fetch;
  const res = await fetchFn(opts.endpoint ?? SIGNED_URL_ENDPOINT, {
    method: 'POST',
    headers: { authorization: `Bearer ${opts.token}`, 'content-type': 'application/json' },
    body: JSON.stringify({ objectKey, expiresIn: opts.expiresIn }),
  });
  if (!res.ok) {
    throw new Error(`signed-url failed: ${res.status}`);
  }
  const { url } = (await res.json()) as { url: string };
  return url;
}

/** 複数 objectKey の署名付き URL を一括取得する (notebook 一覧、Function 呼出を 1 回に集約)。 */
export async function getSignedUrls(
  objectKeys: string[],
  opts: { token: string; fetchFn?: typeof fetch; endpoint?: string },
): Promise<Record<string, string>> {
  const fetchFn = opts.fetchFn ?? fetch;
  const res = await fetchFn(opts.endpoint ?? SIGNED_URL_ENDPOINT, {
    method: 'POST',
    headers: { authorization: `Bearer ${opts.token}`, 'content-type': 'application/json' },
    body: JSON.stringify({ objectKeys }),
  });
  if (!res.ok) {
    throw new Error(`signed-url (batch) failed: ${res.status}`);
  }
  const { urls } = (await res.json()) as { urls: Record<string, string> };
  return urls;
}

export type UseSignedUrlOptions = {
  token: string;
  fetchFn?: typeof fetch;
  /** refetch 間隔 (既定 55 分)。 */
  refetchMs?: number;
  endpoint?: string;
};

/**
 * objectKey の署名付き URL を返す hook。null なら fetch せず null。
 * objectKey 変更で再取得し、refetchMs ごとに自動更新、unmount でタイマー破棄。
 */
export function useSignedUrl(objectKey: string | null, opts: UseSignedUrlOptions): string | null {
  const [url, setUrl] = useState<string | null>(null);
  // token / fetchFn / endpoint は ref 経由で参照し、effect の再実行は objectKey/refetchMs のみに限定。
  const optsRef = useRef(opts);
  optsRef.current = opts;
  const refetchMs = opts.refetchMs ?? SIGNED_URL_REFETCH_MS;

  useEffect(() => {
    if (!objectKey) {
      setUrl(null);
      return;
    }
    let active = true;
    const load = async (): Promise<void> => {
      try {
        const next = await getSignedUrl(objectKey, {
          token: optsRef.current.token,
          fetchFn: optsRef.current.fetchFn,
          endpoint: optsRef.current.endpoint,
        });
        if (active) {
          setUrl(next);
        }
      } catch {
        if (active) {
          setUrl(null);
        }
      }
    };
    void load();
    const timer = setInterval(() => void load(), refetchMs);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [objectKey, refetchMs]);

  return url;
}

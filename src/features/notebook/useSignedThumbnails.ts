/**
 * 一覧カードのサムネ署名 URL を非同期解決する hook (revise_001)。
 *
 * NotebookDiscovery / MemoryDiscovery の `imageObjectKey` を `/api/storage/signed-url` 経由で
 * 署名付き GET URL に解決し objectKey→URL でキャッシュする。同期 seam `resolveThumbnail(item)=>url|null`
 * を返す (TimelineView 等の既存 props に適合)。解決前 / key 無し / 失敗 は null (プレースホルダ)。
 *
 * R2 GET CORS は app origin を許可済 (perspectives O44)。署名 URL 取得は表示中の item 分のみ。
 * 関連: src/shared/storage/fetch.ts (getSignedUrl), NotebookContainer.tsx
 */
import { useEffect, useRef, useState } from 'react';
import { getSignedUrl, type SignedUrlOptions } from '../../shared/storage/fetch';

type Thumbable = { imageObjectKey?: string | null };

export type UseSignedThumbnailsOptions = {
  token: string;
  fetchFn?: typeof fetch;
  /** テスト注入: objectKey→URL 解決 (既定は getSignedUrl)。 */
  resolve?: (objectKey: string, opts: SignedUrlOptions) => Promise<string>;
};

export function useSignedThumbnails<T extends Thumbable>(
  items: T[],
  opts: UseSignedThumbnailsOptions,
): { resolveThumbnail: (item: T) => string | null } {
  const { token, fetchFn } = opts;
  const resolve = opts.resolve ?? getSignedUrl;
  const [urls, setUrls] = useState<Record<string, string>>({}); // objectKey → signed URL
  const resolvedRef = useRef<Record<string, string>>({}); // 解決済 (effect deps から urls を外すため)
  const inflight = useRef<Set<string>>(new Set());

  useEffect(() => {
    let active = true;
    const keys = Array.from(
      new Set(items.map((i) => i.imageObjectKey).filter((k): k is string => Boolean(k))),
    );
    for (const key of keys) {
      if (resolvedRef.current[key] || inflight.current.has(key)) continue;
      inflight.current.add(key);
      void resolve(key, { token, fetchFn })
        .then((url) => {
          resolvedRef.current[key] = url;
          if (active) setUrls((prev) => ({ ...prev, [key]: url }));
        })
        .catch(() => {
          /* 失敗はプレースホルダにフォールバック (致命でない) */
        })
        .finally(() => {
          inflight.current.delete(key);
        });
    }
    return () => {
      active = false;
    };
  }, [items, token, fetchFn, resolve]);

  return {
    resolveThumbnail: (item) =>
      item.imageObjectKey ? (urls[item.imageObjectKey] ?? null) : null,
  };
}

/**
 * R2 オブジェクトメタ取得 (frontend) — `POST /api/storage/meta` 経由
 *
 * - `getObjectMetadata`: 単一 objectKey の {size, contentType, uploadedAt}
 * - `listUserImages`: 認証 user 自身の画像一覧 (server が JWT から prefix を導出、userId は送らない)
 *
 * 関連: docs/_shared/storage/001_storage_SPEC.md §1.3, 003_storage_UNIT_TEST.md §1.4 (UT-ST-M01〜M03)
 */

export type ObjectMetadata = { size: number; contentType: string; uploadedAt: string };
export type StorageObject = { objectKey: string; size: number; uploadedAt: string };

const META_ENDPOINT = '/api/storage/meta';

type MetaRequestOptions = { token: string; fetchFn?: typeof fetch; endpoint?: string };

async function postMeta(body: unknown, opts: MetaRequestOptions): Promise<unknown> {
  const fetchFn = opts.fetchFn ?? fetch;
  const res = await fetchFn(opts.endpoint ?? META_ENDPOINT, {
    method: 'POST',
    headers: { authorization: `Bearer ${opts.token}`, 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    throw new Error(`storage meta failed: ${res.status}`);
  }
  return res.json();
}

/** objectKey の R2 メタを取得する (UT-ST-M01)。 */
export async function getObjectMetadata(
  objectKey: string,
  opts: MetaRequestOptions,
): Promise<ObjectMetadata> {
  return (await postMeta({ action: 'head', objectKey }, opts)) as ObjectMetadata;
}

/** 認証 user 自身の画像一覧を取得する (UT-ST-M02、他 user は server prefix で除外=M03)。 */
export async function listUserImages(opts: MetaRequestOptions): Promise<StorageObject[]> {
  const { objects } = (await postMeta({ action: 'list' }, opts)) as { objects: StorageObject[] };
  return objects;
}

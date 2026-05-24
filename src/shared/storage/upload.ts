/**
 * R2 画像アップロード (frontend) — presigned URL 取得 → 直接 PUT (+ retry)
 *
 * 1. `POST /api/storage/upload-url` で PUT presigned URL + objectKey を取得 (事前に WebP/5MB 検証)
 * 2. 取得 URL に file を直接 PUT (R2)。network/5xx 失敗は exponential backoff で 2 回 retry し、
 *    尽きたら UploadFailedError。
 *
 * 関連: docs/_shared/storage/001_storage_SPEC.md §1.2, 003_storage_UNIT_TEST.md §1.2 (UT-ST-U01〜U07/E01)
 */
import { validateUploadInput, ALLOWED_CONTENT_TYPE } from './validation';
import { UploadFailedError } from './errors';

export type UploadResult = { objectKey: string; size: number; uploadedAt: string };

export type UploadOptions = {
  /** 紐付ける discovery の id。 */
  discoveryId: string;
  /** Clerk session token (Authorization: Bearer)。 */
  token: string;
  /** 既定は file.type → image/webp。 */
  contentType?: string;
  fetchFn?: typeof fetch;
  /** PUT の retry 回数 (既定 2、UT-ST-U04)。 */
  maxRetries?: number;
  /** backoff sleep (テスト注入)。 */
  sleep?: (ms: number) => Promise<void>;
  endpoint?: string;
};

const UPLOAD_URL_ENDPOINT = '/api/storage/upload-url';
const DELETE_ENDPOINT = '/api/storage/delete';

function resolveContentType(file: Blob, opts: UploadOptions): string {
  return opts.contentType ?? file.type ?? ALLOWED_CONTENT_TYPE;
}

async function requestUploadUrl(
  file: Blob,
  contentType: string,
  opts: UploadOptions,
  fetchFn: typeof fetch,
): Promise<{ presignedUrl: string; objectKey: string }> {
  // クライアント側で先に検証 (無駄な Function 呼出を避ける、UT-ST-U02/U03)。
  validateUploadInput({ contentType, sizeBytes: file.size });
  const res = await fetchFn(opts.endpoint ?? UPLOAD_URL_ENDPOINT, {
    method: 'POST',
    headers: { authorization: `Bearer ${opts.token}`, 'content-type': 'application/json' },
    body: JSON.stringify({ discoveryId: opts.discoveryId, contentType, sizeBytes: file.size }),
  });
  if (!res.ok) {
    // 403 (所有者違反/RLS) を含む全失敗 (UT-ST-U07)。
    throw new UploadFailedError(`upload-url failed: ${res.status}`);
  }
  return (await res.json()) as { presignedUrl: string; objectKey: string };
}

async function putWithRetry(
  url: string,
  file: Blob,
  contentType: string,
  fetchFn: typeof fetch,
  maxRetries: number,
  sleep: (ms: number) => Promise<void>,
): Promise<void> {
  let lastErr: unknown;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const res = await fetchFn(url, {
        method: 'PUT',
        headers: { 'content-type': contentType },
        body: file,
      });
      if (res.ok) {
        return;
      }
      lastErr = new UploadFailedError(`R2 PUT failed: ${res.status}`);
    } catch (err) {
      lastErr = err;
    }
    if (attempt < maxRetries) {
      await sleep(2 ** attempt * 100);
    }
  }
  console.error('uploadPlantImage: all PUT retries failed', lastErr);
  throw new UploadFailedError('upload failed after retries', lastErr);
}

/** WebP Blob を R2 に upload し、保存された objectKey を返す。 */
export async function uploadPlantImage(file: Blob, opts: UploadOptions): Promise<UploadResult> {
  const fetchFn = opts.fetchFn ?? fetch;
  const sleep = opts.sleep ?? ((ms: number) => new Promise<void>((r) => setTimeout(r, ms)));
  const maxRetries = opts.maxRetries ?? 2;
  const contentType = resolveContentType(file, opts);

  const { presignedUrl, objectKey } = await requestUploadUrl(file, contentType, opts, fetchFn);
  await putWithRetry(presignedUrl, file, contentType, fetchFn, maxRetries, sleep);
  return { objectKey, size: file.size, uploadedAt: new Date().toISOString() };
}

/**
 * 撮り直し時の差し替え。R2 PUT は upsert 相当なので upload と同じ経路で新規 presign + PUT する
 * (新 objectKey を返す、旧 key の削除は呼出側責務、UT-ST-U05)。
 */
export async function replacePlantImage(file: Blob, opts: UploadOptions): Promise<UploadResult> {
  return uploadPlantImage(file, opts);
}

/** objectKey を指定して R2 から削除する (UT-ST-U06)。 */
export async function deletePlantImage(
  objectKey: string,
  opts: { token: string; fetchFn?: typeof fetch; endpoint?: string },
): Promise<void> {
  const fetchFn = opts.fetchFn ?? fetch;
  const res = await fetchFn(opts.endpoint ?? DELETE_ENDPOINT, {
    method: 'POST',
    headers: { authorization: `Bearer ${opts.token}`, 'content-type': 'application/json' },
    body: JSON.stringify({ objectKey }),
  });
  if (!res.ok) {
    throw new UploadFailedError(`delete failed: ${res.status}`);
  }
}

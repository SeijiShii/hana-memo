/**
 * Presigned URL オーケストレーション (SDK 非依存コア)
 *
 * `PresignClient` (DI) に実 R2 presign (@aws-sdk/s3-request-presigner) を注入する。
 * 本モジュールは「検証 → key 構築 → 所有確認 → presign 呼出」の純粋なオーケストレーションのみ担い、
 * Vercel Function (`api/storage/*`) が PresignClient を実装する。
 *
 * 関連: docs/_shared/storage/001_storage_SPEC.md §1.1, §3.3, §6.1
 */
import { validateObjectKey } from '../helpers/url';
import { buildObjectKey } from './bucket';
import { validateUploadInput } from './validation';

/** PUT presigned URL の TTL (漏洩時被害を限定、§3.3) */
export const UPLOAD_URL_TTL_SEC = 300; // 5 min
/** GET presigned URL の TTL */
export const FETCH_URL_TTL_SEC = 3600; // 60 min

/** 実 R2 操作を抽象化 (実体は @aws-sdk を api/storage/_lib/r2.ts で注入) */
export type PresignClient = {
  presignPut(objectKey: string, ttlSec: number, contentType: string): Promise<string>;
  presignGet(objectKey: string, ttlSec: number): Promise<string>;
  deleteObject(objectKey: string): Promise<void>;
};

export type CreateUploadUrlInput = {
  userId: string;
  discoveryId: string;
  imageId: string;
  contentType: string;
  sizeBytes: number;
};

/** upload-url: 入力検証 → key 構築 → PUT presign (5 分 TTL)。 */
export async function createUploadUrl(
  client: PresignClient,
  input: CreateUploadUrlInput,
): Promise<{ presignedUrl: string; objectKey: string }> {
  validateUploadInput({ contentType: input.contentType, sizeBytes: input.sizeBytes });
  const objectKey = buildObjectKey(input.userId, input.discoveryId, input.imageId);
  const presignedUrl = await client.presignPut(objectKey, UPLOAD_URL_TTL_SEC, input.contentType);
  return { presignedUrl, objectKey };
}

/** signed-url (single): 所有確認 → GET presign。 */
export async function createSignedUrl(
  client: PresignClient,
  input: { objectKey: string; userId: string; expiresIn?: number },
): Promise<string> {
  validateObjectKey(input.objectKey, input.userId); // userId prefix + traversal ([SEC-003])
  return client.presignGet(input.objectKey, input.expiresIn ?? FETCH_URL_TTL_SEC);
}

/**
 * signed-url (batch): 各 key を所有確認 + presign。
 * 検証失敗 / presign 失敗の key は結果から除外する (他の key は返す、UT-ST-F04)。
 */
export async function createSignedUrls(
  client: PresignClient,
  input: { objectKeys: string[]; userId: string },
): Promise<Record<string, string>> {
  const out: Record<string, string> = {};
  await Promise.all(
    input.objectKeys.map(async (key) => {
      try {
        validateObjectKey(key, input.userId);
        out[key] = await client.presignGet(key, FETCH_URL_TTL_SEC);
      } catch {
        // 失敗した key は undefined のまま (呼び出し側で欠落判定)
      }
    }),
  );
  return out;
}

/** delete: 所有確認 → R2 DeleteObject。 */
export async function deleteObject(
  client: PresignClient,
  input: { objectKey: string; userId: string },
): Promise<void> {
  validateObjectKey(input.objectKey, input.userId);
  await client.deleteObject(input.objectKey);
}

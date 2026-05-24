/**
 * Cloudflare R2 (S3 互換) クライアント + PresignClient / MetaClient 実装 (Vercel Function 専用)
 *
 * `src/shared/storage/presign.ts` の `PresignClient` interface を @aws-sdk/client-s3 +
 * @aws-sdk/s3-request-presigner で実装する。SDK 依存はこのファイルに隔離し、handler は
 * dynamic import で読み込む (handler の unit test を SDK 非依存に保つ)。
 *
 * 関連: docs/_shared/storage/001_storage_SPEC.md §2.1/§3.3, 002_storage_PLAN.md §1.2
 */
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
  ListObjectsV2Command,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import type { PresignClient } from '../../../src/shared/storage/presign';

export type R2Config = {
  accountId: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucket: string;
  /** S3 互換エンドポイント (account id から導出)。 */
  endpoint: string;
};

/** R2 接続情報を env から読み出す (純関数、不足キーを列挙して throw)。 */
export function loadR2Config(env: NodeJS.ProcessEnv = process.env): R2Config {
  const accountId = env.R2_ACCOUNT_ID;
  const accessKeyId = env.R2_ACCESS_KEY_ID;
  const secretAccessKey = env.R2_SECRET_ACCESS_KEY;
  const bucket = env.R2_BUCKET_NAME;
  const missing = Object.entries({
    R2_ACCOUNT_ID: accountId,
    R2_ACCESS_KEY_ID: accessKeyId,
    R2_SECRET_ACCESS_KEY: secretAccessKey,
    R2_BUCKET_NAME: bucket,
  })
    .filter(([, v]) => !v)
    .map(([k]) => k);
  if (missing.length > 0) {
    throw new Error(`R2 config missing env: ${missing.join(', ')}`);
  }
  return {
    accountId: accountId as string,
    accessKeyId: accessKeyId as string,
    secretAccessKey: secretAccessKey as string,
    bucket: bucket as string,
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
  };
}

/** R2 用 S3Client を生成 (region=auto)。 */
export function createR2Client(config: R2Config = loadR2Config()): S3Client {
  return new S3Client({
    region: 'auto',
    endpoint: config.endpoint,
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    },
  });
}

/** getSignedUrl の最小シグネチャ (テスト注入用)。 */
export type SignFn = (
  client: S3Client,
  command: object,
  opts: { expiresIn: number },
) => Promise<string>;

export type R2PresignDeps = {
  client?: S3Client;
  sign?: SignFn;
  bucket?: string;
};

/** client / bucket のどちらかが未注入なら env から補完する。 */
function resolveClientAndBucket(deps: { client?: S3Client; bucket?: string }): {
  client: S3Client;
  bucket: string;
} {
  let { client, bucket } = deps;
  if (!client || !bucket) {
    const config = loadR2Config();
    bucket ??= config.bucket;
    client ??= createR2Client(config);
  }
  return { client, bucket };
}

/** presign.ts core 用の `PresignClient` を R2 で実装する。 */
export function createR2PresignClient(deps: R2PresignDeps = {}): PresignClient {
  const { client, bucket } = resolveClientAndBucket(deps);
  const sign = deps.sign ?? (getSignedUrl as unknown as SignFn);
  return {
    presignPut: (objectKey, ttlSec, contentType) =>
      sign(
        client,
        new PutObjectCommand({ Bucket: bucket, Key: objectKey, ContentType: contentType }),
        {
          expiresIn: ttlSec,
        },
      ),
    presignGet: (objectKey, ttlSec) =>
      sign(client, new GetObjectCommand({ Bucket: bucket, Key: objectKey }), { expiresIn: ttlSec }),
    deleteObject: async (objectKey) => {
      await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: objectKey }));
    },
  };
}

/** オブジェクト本体を直接書き込む (cron 等のサーバ生成成果物用、presign を経由しない)。 */
export type ObjectWriter = (objectKey: string, body: string, contentType: string) => Promise<void>;

/** R2 への直接 PUT 関数を生成する (export-revenue cron 等が利用)。 */
export function createR2Writer(deps: { client?: S3Client; bucket?: string } = {}): ObjectWriter {
  const { client, bucket } = resolveClientAndBucket(deps);
  return async (objectKey, body, contentType) => {
    await client.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: objectKey,
        Body: body,
        ContentType: contentType,
      }),
    );
  };
}

export type R2ObjectMeta = { size: number; contentType: string; uploadedAt: string };
export type R2StorageObject = { objectKey: string; size: number; uploadedAt: string };

/** HEAD / ListObjectsV2 を抽象化 (meta.ts handler が利用)。 */
export type MetaClient = {
  head(objectKey: string): Promise<R2ObjectMeta>;
  listByPrefix(prefix: string): Promise<R2StorageObject[]>;
};

export type R2MetaDeps = { client?: S3Client; bucket?: string };

/** R2 で `MetaClient` を実装する。 */
export function createR2MetaClient(deps: R2MetaDeps = {}): MetaClient {
  const { client, bucket } = resolveClientAndBucket(deps);
  return {
    head: async (objectKey) => {
      const res = await client.send(new HeadObjectCommand({ Bucket: bucket, Key: objectKey }));
      return {
        size: res.ContentLength ?? 0,
        contentType: res.ContentType ?? 'application/octet-stream',
        uploadedAt: (res.LastModified ?? new Date(0)).toISOString(),
      };
    },
    listByPrefix: async (prefix) => {
      const res = await client.send(new ListObjectsV2Command({ Bucket: bucket, Prefix: prefix }));
      return (res.Contents ?? [])
        .filter((o): o is { Key: string; Size?: number; LastModified?: Date } => Boolean(o.Key))
        .map((o) => ({
          objectKey: o.Key,
          size: o.Size ?? 0,
          uploadedAt: (o.LastModified ?? new Date(0)).toISOString(),
        }));
    },
  };
}

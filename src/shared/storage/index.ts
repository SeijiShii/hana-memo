// _shared/storage barrel
// 関連: docs/_shared/storage/001_storage_SPEC.md
// SDK 非依存コア (errors/bucket/validation/presign) + frontend glue (upload/fetch/meta)。
// @aws-sdk presign 実体は api/storage/_lib/r2.ts (Vercel Function only)。
export { InvalidImageError, UploadFailedError, StorageOwnershipError } from './errors';
export { BUCKET_NAME, buildObjectKey, parseObjectKey, type ParsedObjectKey } from './bucket';
export { MAX_UPLOAD_BYTES, ALLOWED_CONTENT_TYPE, validateUploadInput } from './validation';
export {
  UPLOAD_URL_TTL_SEC,
  FETCH_URL_TTL_SEC,
  createUploadUrl,
  createSignedUrl,
  createSignedUrls,
  deleteObject,
  type PresignClient,
  type CreateUploadUrlInput,
} from './presign';
export {
  uploadPlantImage,
  replacePlantImage,
  deletePlantImage,
  type UploadResult,
  type UploadOptions,
} from './upload';
export {
  getSignedUrl,
  getSignedUrls,
  useSignedUrl,
  SIGNED_URL_REFETCH_MS,
  type SignedUrlOptions,
  type UseSignedUrlOptions,
} from './fetch';
export { getObjectMetadata, listUserImages, type ObjectMetadata, type StorageObject } from './meta';

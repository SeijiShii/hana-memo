// _shared/storage barrel (SDK 非依存コア)
// 関連: docs/_shared/storage/001_storage_SPEC.md
// @aws-sdk presign (api/storage/*) / React useSignedUrl / meta は app/api bootstrap フェーズで追加
export { InvalidImageError, UploadFailedError, StorageOwnershipError } from './errors';
export {
  BUCKET_NAME,
  buildObjectKey,
  parseObjectKey,
  type ParsedObjectKey,
} from './bucket';
export {
  MAX_UPLOAD_BYTES,
  ALLOWED_CONTENT_TYPE,
  validateUploadInput,
} from './validation';
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

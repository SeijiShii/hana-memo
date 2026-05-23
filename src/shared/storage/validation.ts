/**
 * アップロード入力検証 (contentType / サイズ)
 * 関連: docs/_shared/storage/001_storage_SPEC.md §4.1, 003_storage_UNIT_TEST.md §1.2
 */
import { InvalidImageError } from './errors';

/** 上限 5MB (helpers/image で事前圧縮想定) */
export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;

/** R2 に上げるのは WebP のみ (EXIF strip + 変換は helpers/image 責務) */
export const ALLOWED_CONTENT_TYPE = 'image/webp';

/** upload-url 発行前のクライアント入力検証。違反は InvalidImageError。 */
export function validateUploadInput(input: {
  contentType: string;
  sizeBytes: number;
}): void {
  if (input.contentType !== ALLOWED_CONTENT_TYPE) {
    throw new InvalidImageError(
      `contentType must be ${ALLOWED_CONTENT_TYPE}, got ${input.contentType}`,
    );
  }
  if (!Number.isFinite(input.sizeBytes) || input.sizeBytes <= 0) {
    throw new InvalidImageError('sizeBytes must be a positive number');
  }
  if (input.sizeBytes > MAX_UPLOAD_BYTES) {
    throw new InvalidImageError(`sizeBytes exceeds ${MAX_UPLOAD_BYTES} (5MB)`);
  }
}

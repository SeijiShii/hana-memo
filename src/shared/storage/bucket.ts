/**
 * R2 bucket 定数 + オブジェクトキー規約
 * 規約: `{user_id}/{discovery_id}/{image_id}.webp`
 *
 * 関連: docs/_shared/storage/001_storage_SPEC.md §3.1-§3.2, 003_storage_UNIT_TEST.md §1.1
 */
import { InvalidImageError } from './errors';

export const BUCKET_NAME = 'plant-images';

const SEGMENTS: ['userId', 'discoveryId', 'imageId'] = ['userId', 'discoveryId', 'imageId'];

/** `{userId}/{discoveryId}/{imageId}.webp` を組み立てる (各 segment は非空 + `/` 不可)。 */
export function buildObjectKey(
  userId: string,
  discoveryId: string,
  imageId: string,
): string {
  const values = { userId, discoveryId, imageId };
  for (const name of SEGMENTS) {
    const v = values[name];
    if (!v || typeof v !== 'string') {
      throw new InvalidImageError(`${name} must be a non-empty string`);
    }
    if (v.includes('/')) {
      throw new InvalidImageError(`${name} must not contain '/'`);
    }
  }
  return `${userId}/${discoveryId}/${imageId}.webp`;
}

export type ParsedObjectKey = {
  userId: string;
  discoveryId: string;
  imageId: string;
};

/** objectKey を分解する。規約外なら InvalidImageError。 */
export function parseObjectKey(key: string): ParsedObjectKey {
  const m = /^([^/]+)\/([^/]+)\/([^/]+)\.webp$/.exec(key);
  if (!m) {
    throw new InvalidImageError(`invalid object key format: ${key}`);
  }
  return { userId: m[1]!, discoveryId: m[2]!, imageId: m[3]! };
}

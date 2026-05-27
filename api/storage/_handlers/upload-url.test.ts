/**
 * api/storage/upload-url.ts 単体テスト (request body 正規化)
 * 由来: 003_storage_UNIT_TEST.md §1.2 (入力検証)
 */
import { describe, it, expect } from 'vitest';
import { parseUploadUrlBody } from './upload-url';
import { InvalidImageError } from '../../../src/shared/storage/errors';

describe('parseUploadUrlBody', () => {
  it('正常 body を正規化する', () => {
    expect(
      parseUploadUrlBody({ discoveryId: 'd1', contentType: 'image/webp', sizeBytes: 2048 }),
    ).toEqual({ discoveryId: 'd1', contentType: 'image/webp', sizeBytes: 2048 });
  });

  it('discoveryId 欠落は InvalidImageError', () => {
    expect(() => parseUploadUrlBody({ contentType: 'image/webp', sizeBytes: 10 })).toThrow(
      InvalidImageError,
    );
  });

  it('型不正なフィールドは既定値 (検証は core/validateUploadInput に委ねる)', () => {
    const out = parseUploadUrlBody({ discoveryId: 'd1', contentType: 123, sizeBytes: '10' });
    expect(out.contentType).toBe('');
    expect(Number.isNaN(out.sizeBytes)).toBe(true);
  });

  it('null/undefined body は InvalidImageError (discoveryId 無し)', () => {
    expect(() => parseUploadUrlBody(null)).toThrow(InvalidImageError);
    expect(() => parseUploadUrlBody(undefined)).toThrow(InvalidImageError);
  });
});

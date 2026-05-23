/**
 * bucket.ts + validation.ts 単体テスト
 * 由来: 003_storage_UNIT_TEST.md §1.1 (B01/B02) + §1.2 (U02/U03)
 */
import { describe, it, expect } from 'vitest';
import { buildObjectKey, parseObjectKey, BUCKET_NAME } from './bucket';
import { validateUploadInput, MAX_UPLOAD_BYTES } from './validation';
import { InvalidImageError } from './errors';

describe('buildObjectKey', () => {
  it('UT-ST-B01: {userId}/{discoveryId}/{imageId}.webp', () => {
    expect(buildObjectKey('u1', 'd1', 'i1')).toBe('u1/d1/i1.webp');
  });

  it('UT-ST-B02: userId 空 → throw', () => {
    expect(() => buildObjectKey('', 'd1', 'i1')).toThrow(InvalidImageError);
  });

  it('segment に / を含む → throw', () => {
    expect(() => buildObjectKey('u1', 'd/1', 'i1')).toThrow(InvalidImageError);
  });

  it('BUCKET_NAME は plant-images', () => {
    expect(BUCKET_NAME).toBe('plant-images');
  });
});

describe('parseObjectKey', () => {
  it('正常な key を分解', () => {
    expect(parseObjectKey('u1/d1/i1.webp')).toEqual({
      userId: 'u1',
      discoveryId: 'd1',
      imageId: 'i1',
    });
  });

  it('build → parse 往復', () => {
    const key = buildObjectKey('user_a', 'disc_b', 'img_c');
    expect(parseObjectKey(key)).toEqual({
      userId: 'user_a',
      discoveryId: 'disc_b',
      imageId: 'img_c',
    });
  });

  it('規約外 (拡張子なし) → throw', () => {
    expect(() => parseObjectKey('u1/d1/i1.jpg')).toThrow(InvalidImageError);
  });

  it('規約外 (segment 不足) → throw', () => {
    expect(() => parseObjectKey('u1/i1.webp')).toThrow(InvalidImageError);
  });
});

describe('validateUploadInput', () => {
  it('UT-ST-U01 前提: webp 5MB 以下 → OK', () => {
    expect(() => validateUploadInput({ contentType: 'image/webp', sizeBytes: 500_000 })).not.toThrow();
  });

  it('UT-ST-U02: jpeg → InvalidImageError', () => {
    expect(() => validateUploadInput({ contentType: 'image/jpeg', sizeBytes: 100 })).toThrow(
      InvalidImageError,
    );
  });

  it('UT-ST-U03: 10MB → InvalidImageError', () => {
    expect(() =>
      validateUploadInput({ contentType: 'image/webp', sizeBytes: 10 * 1024 * 1024 }),
    ).toThrow(InvalidImageError);
  });

  it('境界: ちょうど 5MB は OK、+1 byte は NG', () => {
    expect(() => validateUploadInput({ contentType: 'image/webp', sizeBytes: MAX_UPLOAD_BYTES })).not.toThrow();
    expect(() =>
      validateUploadInput({ contentType: 'image/webp', sizeBytes: MAX_UPLOAD_BYTES + 1 }),
    ).toThrow(InvalidImageError);
  });

  it('サイズ 0 / 負 → InvalidImageError', () => {
    expect(() => validateUploadInput({ contentType: 'image/webp', sizeBytes: 0 })).toThrow(
      InvalidImageError,
    );
    expect(() => validateUploadInput({ contentType: 'image/webp', sizeBytes: -1 })).toThrow(
      InvalidImageError,
    );
  });
});

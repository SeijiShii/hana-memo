/**
 * capture/attach 単体テスト (parseAttachBody 検証)
 * 由来: docs/capture/003_capture_UNIT_TEST.md §1.4 (UT-CA-A02)
 */
import { describe, it, expect } from 'vitest';
import { parseAttachBody } from './attach';

describe('parseAttachBody', () => {
  it('必須を正規化 + mime 既定 image/webp', () => {
    expect(parseAttachBody({ discoveryId: 'd1', objectKey: 'u1/d1/i1.webp', sizeBytes: 1234 })).toEqual({
      discoveryId: 'd1',
      objectKey: 'u1/d1/i1.webp',
      sizeBytes: 1234,
      mime: 'image/webp',
    });
  });

  it('mime 指定を尊重', () => {
    const out = parseAttachBody({
      discoveryId: 'd1',
      objectKey: 'k',
      sizeBytes: 1,
      mime: 'image/png',
    });
    expect(out.mime).toBe('image/png');
  });

  it('必須欠落 / sizeBytes 非数値は throw', () => {
    expect(() => parseAttachBody({ objectKey: 'k', sizeBytes: 1 })).toThrow();
    expect(() => parseAttachBody({ discoveryId: 'd1', sizeBytes: 1 })).toThrow();
    expect(() => parseAttachBody({ discoveryId: 'd1', objectKey: 'k' })).toThrow();
  });
});

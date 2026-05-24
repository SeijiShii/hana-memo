/**
 * api/storage/signed-url.ts 単体テスト (request body 正規化)
 * 由来: 003_storage_UNIT_TEST.md §1.3
 */
import { describe, it, expect } from 'vitest';
import { parseSignedUrlBody } from './signed-url';
import { ValidationError } from '../../src/shared/helpers/url';

describe('parseSignedUrlBody', () => {
  it('single objectKey を正規化する', () => {
    expect(parseSignedUrlBody({ objectKey: 'u/d/i.webp' })).toEqual({ objectKey: 'u/d/i.webp' });
  });

  it('single + expiresIn を保持する', () => {
    expect(parseSignedUrlBody({ objectKey: 'u/d/i.webp', expiresIn: 300 })).toEqual({
      objectKey: 'u/d/i.webp',
      expiresIn: 300,
    });
  });

  it('batch objectKeys を正規化する', () => {
    expect(parseSignedUrlBody({ objectKeys: ['a', 'b'] })).toEqual({ objectKeys: ['a', 'b'] });
  });

  it('どちらも無い / 型不正は ValidationError', () => {
    expect(() => parseSignedUrlBody({})).toThrow(ValidationError);
    expect(() => parseSignedUrlBody({ objectKeys: [1, 2] })).toThrow(ValidationError);
    expect(() => parseSignedUrlBody(null)).toThrow(ValidationError);
  });
});

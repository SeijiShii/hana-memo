/**
 * api/storage/meta.ts 単体テスト (request body 正規化: head / list)
 * 由来: 003_storage_UNIT_TEST.md §1.4 (UT-ST-M01〜M03)
 */
import { describe, it, expect } from 'vitest';
import { parseMetaBody } from './meta';
import { ValidationError } from '../../../src/shared/helpers/url';

describe('parseMetaBody', () => {
  it('head + objectKey を正規化する', () => {
    expect(parseMetaBody({ action: 'head', objectKey: 'u/d/i.webp' })).toEqual({
      action: 'head',
      objectKey: 'u/d/i.webp',
    });
  });

  it('list を正規化する', () => {
    expect(parseMetaBody({ action: 'list' })).toEqual({ action: 'list' });
  });

  it('head で objectKey 欠落は ValidationError', () => {
    expect(() => parseMetaBody({ action: 'head' })).toThrow(ValidationError);
  });

  it('未知 action / null は ValidationError', () => {
    expect(() => parseMetaBody({ action: 'delete' })).toThrow(ValidationError);
    expect(() => parseMetaBody(null)).toThrow(ValidationError);
  });
});

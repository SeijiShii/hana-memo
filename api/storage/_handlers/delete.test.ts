/**
 * api/storage/delete.ts 単体テスト (request body 正規化)
 * 由来: 003_storage_UNIT_TEST.md §1.2 (UT-ST-U06)
 */
import { describe, it, expect } from 'vitest';
import { parseDeleteBody } from './delete';
import { ValidationError } from '../../../src/shared/helpers/url';

describe('parseDeleteBody', () => {
  it('objectKey を正規化する', () => {
    expect(parseDeleteBody({ objectKey: 'u/d/i.webp' })).toEqual({ objectKey: 'u/d/i.webp' });
  });

  it('objectKey 欠落 / 型不正は ValidationError', () => {
    expect(() => parseDeleteBody({})).toThrow(ValidationError);
    expect(() => parseDeleteBody({ objectKey: '' })).toThrow(ValidationError);
    expect(() => parseDeleteBody({ objectKey: 123 })).toThrow(ValidationError);
    expect(() => parseDeleteBody(null)).toThrow(ValidationError);
  });
});

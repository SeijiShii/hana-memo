/**
 * notebook/edit 単体テスト (parseEditBody 検証 + field マッピング)
 * 由来: docs/notebook/003_notebook_UNIT_TEST.md §1.2 (UT-NB-A01/A02) + §1.5 (U03 範囲)
 */
import { describe, it, expect } from 'vitest';
import { parseEditBody } from './edit';
import { NotebookError } from '../../../src/features/notebook/errors';

describe('parseEditBody', () => {
  it('UT-NB-A01: common_name を trim 正規化', () => {
    expect(parseEditBody({ discoveryId: 'd1', field: 'common_name', value: '  タンポポ  ' })).toEqual({
      discoveryId: 'd1',
      field: 'common_name',
      value: 'タンポポ',
    });
  });

  it('common_name 空は NotebookError', () => {
    expect(() => parseEditBody({ discoveryId: 'd1', field: 'common_name', value: '   ' })).toThrow(
      NotebookError,
    );
  });

  it('user_note を 500 で trim', () => {
    const out = parseEditBody({ discoveryId: 'd1', field: 'user_note', value: 'あ'.repeat(600) });
    expect(out.field).toBe('user_note');
    expect((out as { value: string }).value).toHaveLength(500);
  });

  it('UT-NB-A02: location lat/lng を受ける', () => {
    expect(parseEditBody({ discoveryId: 'd1', field: 'location', value: { lat: 35, lng: 139 } })).toEqual(
      { discoveryId: 'd1', field: 'location', value: { lat: 35, lng: 139 } },
    );
  });

  it('location 範囲外は NotebookError (validateLocation)', () => {
    expect(() =>
      parseEditBody({ discoveryId: 'd1', field: 'location', value: { lat: 200, lng: 0 } }),
    ).toThrow(NotebookError);
  });

  it('未知 field / discoveryId 欠落は NotebookError', () => {
    expect(() => parseEditBody({ discoveryId: 'd1', field: 'bogus', value: 'x' })).toThrow(NotebookError);
    expect(() => parseEditBody({ field: 'common_name', value: 'x' })).toThrow(NotebookError);
  });
});

/**
 * api/notebook/list.ts 単体テスト (limit clamp + 取得行→NotebookDiscovery 整形)
 *
 * DB クエリ (queryDiscoveries) は DB 依存のため E2E で検証。本テストは純関数
 * clampLimit / rowToNotebookDiscovery (imageObjectKey/location 整形) を対象とする。
 *
 * 由来: docs/notebook/003_notebook_UNIT_TEST.md §1.1 (UT-NB-D01/D02) + thumbnail objectKey 拡張
 */
import { describe, it, expect } from 'vitest';
import { clampLimit, rowToNotebookDiscovery, DEFAULT_PAGE_SIZE, type DiscoveryRow } from './list';

describe('clampLimit', () => {
  it('未指定は既定値', () => {
    expect(clampLimit(null)).toBe(DEFAULT_PAGE_SIZE);
  });
  it('100 超は 100 に clamp', () => {
    expect(clampLimit('500')).toBe(100);
  });
  it('1 未満は 1 に clamp', () => {
    expect(clampLimit('0')).toBe(1);
  });
  it('非数値は既定値', () => {
    expect(clampLimit('abc')).toBe(DEFAULT_PAGE_SIZE);
  });
});

describe('rowToNotebookDiscovery', () => {
  const base: DiscoveryRow = {
    id: 'd1',
    commonName: 'タンポポ',
    originalCommonName: null,
    userOverriddenName: null,
    scientificName: 'Taraxacum',
    userNote: null,
    status: 'identified',
    capturedAt: new Date('2026-05-01T09:00:00.000Z'),
    season: 'spring',
    locationLat: null,
    locationLng: null,
    imageObjectKey: null,
  };

  it('imageObjectKey を保持する (画像添付あり)', () => {
    const out = rowToNotebookDiscovery({ ...base, imageObjectKey: 'user-1/abc.webp' });
    expect(out.imageObjectKey).toBe('user-1/abc.webp');
  });

  it('画像未添付は imageObjectKey=null (leftJoin)', () => {
    expect(rowToNotebookDiscovery(base).imageObjectKey).toBeNull();
  });

  it('capturedAt を ISO 文字列に整形', () => {
    expect(rowToNotebookDiscovery(base).capturedAt).toBe('2026-05-01T09:00:00.000Z');
  });

  it('lat/lng 揃えば location、片方欠落は null', () => {
    expect(rowToNotebookDiscovery({ ...base, locationLat: 35.6, locationLng: 139.7 }).location).toEqual(
      { lat: 35.6, lng: 139.7 },
    );
    expect(rowToNotebookDiscovery({ ...base, locationLat: 35.6, locationLng: null }).location).toBeNull();
  });

  it('season が null なら spring にフォールバック', () => {
    expect(rowToNotebookDiscovery({ ...base, season: null }).season).toBe('spring');
  });
});

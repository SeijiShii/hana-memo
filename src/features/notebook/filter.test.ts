/**
 * filter.ts + grouping.ts 単体テスト (UC2/UC3)
 */
import { describe, it, expect } from 'vitest';
import { filterDiscoveries, matchesFilter, clampRadiusKm } from './filter';
import { sortByCapturedAtDesc, groupBySpecies } from './grouping';
import type { NotebookDiscovery } from './types';

const tokyo = { lat: 35.681, lng: 139.767 };
const osaka = { lat: 34.702, lng: 135.495 };

function d(over: Partial<NotebookDiscovery>): NotebookDiscovery {
  return {
    id: 'x',
    commonName: 'タンポポ',
    scientificName: 'Taraxacum',
    status: 'identified',
    capturedAt: '2026-05-10T00:00:00Z',
    season: 'spring',
    location: tokyo,
    ...over,
  };
}

describe('clampRadiusKm', () => {
  it('0.1〜100 に clamp', () => {
    expect(clampRadiusKm(0.01)).toBe(0.1);
    expect(clampRadiusKm(5)).toBe(5);
    expect(clampRadiusKm(500)).toBe(100);
  });
});

describe('matchesFilter', () => {
  it('season 一致/不一致', () => {
    expect(matchesFilter(d({ season: 'spring' }), { season: 'spring' })).toBe(true);
    expect(matchesFilter(d({ season: 'summer' }), { season: 'spring' })).toBe(false);
  });
  it('month (YYYY-MM) 一致/不一致', () => {
    expect(matchesFilter(d({ capturedAt: '2026-05-10T00:00:00Z' }), { month: '2026-05' })).toBe(true);
    expect(matchesFilter(d({ capturedAt: '2026-04-10T00:00:00Z' }), { month: '2026-05' })).toBe(false);
  });
  it('status 一致/不一致', () => {
    expect(matchesFilter(d({ status: 'pending' }), { status: 'pending' })).toBe(true);
    expect(matchesFilter(d({ status: 'identified' }), { status: 'pending' })).toBe(false);
  });
  it('circle: 中心近傍は true、遠方は false、location null は false', () => {
    expect(matchesFilter(d({ location: tokyo }), { circle: { center: tokyo, radiusKm: 5 } })).toBe(true);
    expect(matchesFilter(d({ location: osaka }), { circle: { center: tokyo, radiusKm: 5 } })).toBe(false);
    expect(matchesFilter(d({ location: null }), { circle: { center: tokyo, radiusKm: 5 } })).toBe(false);
  });
  it('keyword: common/scientific/note 部分一致 (大小無視)', () => {
    expect(matchesFilter(d({ commonName: 'タンポポ' }), { keyword: 'タンポ' })).toBe(true);
    expect(matchesFilter(d({ scientificName: 'Taraxacum' }), { keyword: 'tarax' })).toBe(true);
    expect(matchesFilter(d({ userNote: '白い花' }), { keyword: '白い' })).toBe(true);
    expect(matchesFilter(d({ commonName: 'スミレ', scientificName: 'Viola', userNote: null }), { keyword: 'バラ' })).toBe(false);
  });
  it('複数条件 AND', () => {
    expect(matchesFilter(d({ season: 'spring', status: 'identified' }), { season: 'spring', status: 'identified' })).toBe(true);
    expect(matchesFilter(d({ season: 'spring', status: 'pending' }), { season: 'spring', status: 'identified' })).toBe(false);
  });
  it('空フィルタ → 全 true', () => {
    expect(matchesFilter(d({}), {})).toBe(true);
  });
});

describe('filterDiscoveries', () => {
  it('配列をフィルタ', () => {
    const list = [d({ id: 'a', season: 'spring' }), d({ id: 'b', season: 'summer' })];
    expect(filterDiscoveries(list, { season: 'spring' }).map((x) => x.id)).toEqual(['a']);
  });
});

describe('grouping', () => {
  it('sortByCapturedAtDesc: 最新が先頭 (非破壊)', () => {
    const list = [
      d({ id: 'old', capturedAt: '2026-01-01T00:00:00Z' }),
      d({ id: 'new', capturedAt: '2026-05-01T00:00:00Z' }),
    ];
    expect(sortByCapturedAtDesc(list).map((x) => x.id)).toEqual(['new', 'old']);
    expect(list[0]!.id).toBe('old'); // 元配列不変
  });
  it('groupBySpecies: scientific_name 別、null は __unknown__', () => {
    const list = [
      d({ id: 'a', scientificName: 'Taraxacum' }),
      d({ id: 'b', scientificName: 'Taraxacum' }),
      d({ id: 'c', scientificName: null }),
    ];
    const g = groupBySpecies(list);
    expect(g['Taraxacum']!.map((x) => x.id)).toEqual(['a', 'b']);
    expect(g['__unknown__']!.map((x) => x.id)).toEqual(['c']);
  });
});

/**
 * recommend.ts 単体テスト (去年の今頃レコメンド)
 * 由来: 001_memory_SPEC.md §1 UC1/UC2, §4.2 (E-ME-002/003)
 */
import { describe, it, expect } from 'vitest';
import {
  lastYearWindow,
  selectLastYearMemories,
  hasMemories,
  memoryCacheKey,
  MEMORY_MAX_ITEMS,
  type MemoryDiscovery,
} from './recommend';

const today = new Date('2026-05-23T00:00:00Z');

function d(over: Partial<MemoryDiscovery>): MemoryDiscovery {
  return {
    id: 'x',
    commonName: 'タンポポ',
    status: 'identified',
    capturedAt: '2025-05-20T00:00:00Z', // 前年同期間
    season: 'spring',
    ...over,
  };
}

describe('lastYearWindow', () => {
  it('前年同日 ±15 日', () => {
    const { start, end } = lastYearWindow(today);
    expect(start.toISOString().slice(0, 10)).toBe('2025-05-08');
    expect(end.toISOString().slice(0, 10)).toBe('2025-06-07');
  });
});

describe('selectLastYearMemories', () => {
  it('UC2: 前年同期間の identified を最新順に返す', () => {
    const list = [
      d({ id: 'a', capturedAt: '2025-05-10T00:00:00Z' }),
      d({ id: 'b', capturedAt: '2025-05-22T00:00:00Z' }),
    ];
    expect(selectLastYearMemories(list, today).map((x) => x.id)).toEqual(['b', 'a']);
  });

  it('identified 以外は除外', () => {
    const list = [d({ id: 'p', status: 'pending' }), d({ id: 'i', status: 'identified' })];
    expect(selectLastYearMemories(list, today).map((x) => x.id)).toEqual(['i']);
  });

  it('期間外 (前年でない / ±15 日外) は除外', () => {
    const list = [
      d({ id: 'thisyear', capturedAt: '2026-05-20T00:00:00Z' }), // 今年
      d({ id: 'farpast', capturedAt: '2025-01-01T00:00:00Z' }), // 前年だが期間外
      d({ id: 'inwindow', capturedAt: '2025-05-20T00:00:00Z' }),
    ];
    expect(selectLastYearMemories(list, today).map((x) => x.id)).toEqual(['inwindow']);
  });

  it('最大 5 件 (MEMORY_MAX_ITEMS)', () => {
    const list = Array.from({ length: 8 }, (_, i) =>
      d({ id: `m${i}`, capturedAt: `2025-05-${15 + i}T00:00:00Z` }),
    );
    expect(selectLastYearMemories(list, today)).toHaveLength(MEMORY_MAX_ITEMS);
  });

  it('E-ME-002/003: 前年データ 0 件 → 空配列', () => {
    expect(selectLastYearMemories([], today)).toEqual([]);
    expect(selectLastYearMemories([d({ capturedAt: '2026-05-20T00:00:00Z' })], today)).toEqual([]);
  });

  it('imageObjectKey を選定後も保持する (サムネ署名取得用)', () => {
    const out = selectLastYearMemories([d({ id: 'k', imageObjectKey: 'user-1/x.webp' })], today);
    expect(out[0]?.imageObjectKey).toBe('user-1/x.webp');
  });
});

describe('hasMemories / memoryCacheKey', () => {
  it('hasMemories: 1 件以上で true', () => {
    expect(hasMemories([])).toBe(false);
    expect(hasMemories([d({})])).toBe(true);
  });
  it('memoryCacheKey: 日次キー', () => {
    expect(memoryCacheKey(today)).toBe('hanamemo_memory_2026-05-23');
  });
});

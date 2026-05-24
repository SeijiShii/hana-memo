// @vitest-environment happy-dom
/**
 * memoryApi.ts 単体テスト (fetch + localStorage 日次キャッシュ)
 * 由来: docs/memory/003_memory_UNIT_TEST.md (キャッシュ TTL + fetch)
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fetchMemories, readMemoryCache, writeMemoryCache } from './memoryApi';
import { memoryCacheKey, type MemoryDiscovery } from './recommend';

function jsonRes(body: unknown, status = 200): Response {
  return { ok: status >= 200 && status < 300, status, json: async () => body } as Response;
}

const mem: MemoryDiscovery = {
  id: 'd1',
  commonName: 'サクラ',
  status: 'identified',
  capturedAt: '2025-05-20T00:00:00Z',
  season: 'spring',
  location: null,
};

beforeEach(() => {
  localStorage.clear();
});

describe('fetchMemories', () => {
  it('GET → memories', async () => {
    const fetchFn = vi.fn<typeof fetch>(async () => jsonRes({ memories: [mem] }));
    const out = await fetchMemories({ token: 't', fetchFn });
    expect(out).toEqual([mem]);
    expect(String(fetchFn.mock.calls[0]![0])).toBe('/api/memory/recommend');
  });

  it('失敗 → throw (hook が silent fail)', async () => {
    const fetchFn = vi.fn<typeof fetch>(async () => jsonRes({ error: 'internal' }, 500));
    await expect(fetchMemories({ token: 't', fetchFn })).rejects.toThrow();
  });
});

describe('memory cache', () => {
  const today = new Date('2026-05-24T00:00:00Z');

  it('write → read (当日キー)', () => {
    expect(readMemoryCache(today)).toBeNull();
    writeMemoryCache(today, [mem]);
    expect(readMemoryCache(today)).toEqual([mem]);
    expect(localStorage.getItem(memoryCacheKey(today))).not.toBeNull();
  });

  it('翌日は別キー → cache miss (TTL 24h 相当)', () => {
    writeMemoryCache(today, [mem]);
    const tomorrow = new Date('2026-05-25T00:00:00Z');
    expect(readMemoryCache(tomorrow)).toBeNull();
  });

  it('壊れた JSON は null', () => {
    localStorage.setItem(memoryCacheKey(today), '{bad');
    expect(readMemoryCache(today)).toBeNull();
  });
});

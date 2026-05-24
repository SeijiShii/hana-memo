// @vitest-environment happy-dom
/**
 * memory/hooks.ts 単体テスト (useMemories: キャッシュ優先 + silent fail)
 * 由来: docs/memory/003_memory_UNIT_TEST.md (E-ME-001/002/003)
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import type { MemoryDiscovery } from './recommend';

const fetchMemoriesMock = vi.fn();
const readMemoryCacheMock = vi.fn();
const writeMemoryCacheMock = vi.fn();

vi.mock('./memoryApi', () => ({
  fetchMemories: (...a: unknown[]) => fetchMemoriesMock(...a),
  readMemoryCache: (...a: unknown[]) => readMemoryCacheMock(...a),
  writeMemoryCache: (...a: unknown[]) => writeMemoryCacheMock(...a),
}));

import { useMemories } from './hooks';

const mem: MemoryDiscovery = {
  id: 'd1',
  commonName: 'サクラ',
  status: 'identified',
  capturedAt: '2025-05-20T00:00:00Z',
  season: 'spring',
  location: null,
};
const now = new Date('2026-05-24T00:00:00Z');

beforeEach(() => {
  fetchMemoriesMock.mockReset();
  readMemoryCacheMock.mockReset();
  writeMemoryCacheMock.mockReset();
});

describe('useMemories', () => {
  it('キャッシュ hit → fetch しない', async () => {
    readMemoryCacheMock.mockReturnValue([mem]);
    const { result } = renderHook(() => useMemories({ token: 't', now }));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.memories).toEqual([mem]);
    expect(result.current.show).toBe(true);
    expect(fetchMemoriesMock).not.toHaveBeenCalled();
  });

  it('cache miss → fetch → writeCache + memories セット', async () => {
    readMemoryCacheMock.mockReturnValue(null);
    fetchMemoriesMock.mockResolvedValue([mem]);
    const { result } = renderHook(() => useMemories({ token: 't', now }));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.memories).toEqual([mem]);
    expect(writeMemoryCacheMock).toHaveBeenCalledWith(now, [mem]);
  });

  it('E-ME-001: fetch 失敗 → silent fail (memories=[], show=false)', async () => {
    readMemoryCacheMock.mockReturnValue(null);
    fetchMemoriesMock.mockRejectedValue(new Error('db down'));
    const { result } = renderHook(() => useMemories({ token: 't', now }));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.memories).toEqual([]);
    expect(result.current.show).toBe(false);
  });

  it('E-ME-003: 0 件 → show=false', async () => {
    readMemoryCacheMock.mockReturnValue(null);
    fetchMemoriesMock.mockResolvedValue([]);
    const { result } = renderHook(() => useMemories({ token: 't', now }));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.show).toBe(false);
  });
});

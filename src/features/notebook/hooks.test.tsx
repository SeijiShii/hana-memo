// @vitest-environment happy-dom
/**
 * notebook/hooks.ts 単体テスト (useNotebook / useDiscoveryEdit)
 * 由来: docs/notebook/003_notebook_UNIT_TEST.md §1.1/§1.2 (D01/D02/D03, A01/A03)
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import type { NotebookDiscovery } from './types';

const fetchDiscoveriesMock = vi.fn();
const updateDiscoveryMock = vi.fn();
const softDeleteDiscoveryMock = vi.fn();

vi.mock('./notebookApi', () => ({
  fetchDiscoveries: (...a: unknown[]) => fetchDiscoveriesMock(...a),
  updateDiscovery: (...a: unknown[]) => updateDiscoveryMock(...a),
  softDeleteDiscovery: (...a: unknown[]) => softDeleteDiscoveryMock(...a),
}));

import { useNotebook, useDiscoveryEdit } from './hooks';

function disc(id: string, season: NotebookDiscovery['season'], capturedAt: string): NotebookDiscovery {
  return {
    id,
    commonName: id,
    scientificName: null,
    status: 'identified',
    capturedAt,
    season,
    location: null,
  };
}

beforeEach(() => {
  fetchDiscoveriesMock.mockReset();
  updateDiscoveryMock.mockReset();
  softDeleteDiscoveryMock.mockReset();
});

describe('useNotebook', () => {
  it('UT-NB-D01: mount で fetch し discoveries を返す (capturedAt 降順)', async () => {
    fetchDiscoveriesMock.mockResolvedValue({
      items: [disc('a', 'spring', '2026-04-01T00:00:00Z'), disc('b', 'spring', '2026-05-01T00:00:00Z')],
      nextCursor: null,
    });
    const { result } = renderHook(() => useNotebook({ token: 't' }));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.discoveries.map((d) => d.id)).toEqual(['b', 'a']); // desc
    expect(result.current.hasMore).toBe(false);
  });

  it('UT-NB-D03: filter (season=summer) を client 適用', async () => {
    fetchDiscoveriesMock.mockResolvedValue({
      items: [disc('a', 'spring', '2026-04-01T00:00:00Z'), disc('b', 'summer', '2026-07-01T00:00:00Z')],
      nextCursor: null,
    });
    const { result } = renderHook(() => useNotebook({ token: 't', filter: { season: 'summer' } }));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.discoveries.map((d) => d.id)).toEqual(['b']);
  });

  it('UT-NB-D02: loadMore で次ページを蓄積', async () => {
    fetchDiscoveriesMock
      .mockResolvedValueOnce({ items: [disc('a', 'spring', '2026-04-01T00:00:00Z')], nextCursor: 'c1' })
      .mockResolvedValueOnce({ items: [disc('b', 'spring', '2026-03-01T00:00:00Z')], nextCursor: null });
    const { result } = renderHook(() => useNotebook({ token: 't' }));
    await waitFor(() => expect(result.current.discoveries).toHaveLength(1));
    expect(result.current.hasMore).toBe(true);
    await act(async () => {
      await result.current.loadMore();
    });
    expect(result.current.discoveries.map((d) => d.id).sort()).toEqual(['a', 'b']);
    expect(fetchDiscoveriesMock).toHaveBeenCalledTimes(2);
    expect(result.current.hasMore).toBe(false);
  });

  it('error 時 error をセット', async () => {
    fetchDiscoveriesMock.mockRejectedValue(new Error('boom'));
    const { result } = renderHook(() => useNotebook({ token: 't' }));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error).toBeInstanceOf(Error);
  });
});

describe('useDiscoveryEdit', () => {
  it('UT-NB-A01: edit → updateDiscovery + onMutated', async () => {
    updateDiscoveryMock.mockResolvedValue(undefined);
    const onMutated = vi.fn();
    const { result } = renderHook(() => useDiscoveryEdit({ token: 't', onMutated }));
    await act(async () => {
      await result.current.edit('d1', { field: 'common_name', value: 'タンポポ' });
    });
    expect(updateDiscoveryMock).toHaveBeenCalledWith(
      'd1',
      { field: 'common_name', value: 'タンポポ' },
      expect.objectContaining({ token: 't' }),
    );
    expect(onMutated).toHaveBeenCalledOnce();
  });

  it('UT-NB-A03: remove → softDeleteDiscovery', async () => {
    softDeleteDiscoveryMock.mockResolvedValue(undefined);
    const { result } = renderHook(() => useDiscoveryEdit({ token: 't' }));
    await act(async () => {
      await result.current.remove('d1');
    });
    expect(softDeleteDiscoveryMock).toHaveBeenCalledWith('d1', expect.objectContaining({ token: 't' }));
  });

  it('編集失敗 → error セット + throw', async () => {
    updateDiscoveryMock.mockRejectedValue(new Error('reject'));
    const { result } = renderHook(() => useDiscoveryEdit({ token: 't' }));
    await act(async () => {
      await expect(result.current.edit('d1', { field: 'user_note', value: 'x' })).rejects.toBeTruthy();
    });
    expect(result.current.error).toBeInstanceOf(Error);
  });
});

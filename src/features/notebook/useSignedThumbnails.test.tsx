// @vitest-environment happy-dom
import { describe, it, expect, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useSignedThumbnails } from './useSignedThumbnails';

type Item = { id: string; imageObjectKey?: string | null };

describe('useSignedThumbnails (revise_001)', () => {
  it('UT-NB-TH01: imageObjectKey を署名 URL に解決して返す', async () => {
    const resolve = vi.fn(async (key: string) => `https://signed/${key}`);
    const items: Item[] = [{ id: 'd1', imageObjectKey: 'k1' }];
    const { result } = renderHook(() => useSignedThumbnails(items, { token: 't', resolve }));
    await waitFor(() =>
      expect(result.current.resolveThumbnail(items[0]!)).toBe('https://signed/k1'),
    );
    expect(resolve).toHaveBeenCalledWith('k1', expect.objectContaining({ token: 't' }));
  });

  it('UT-NB-TH02: imageObjectKey 無し → null (取得しない)', async () => {
    const resolve = vi.fn(async () => 'x');
    const items: Item[] = [{ id: 'd1', imageObjectKey: null }];
    const { result } = renderHook(() => useSignedThumbnails(items, { token: 't', resolve }));
    expect(result.current.resolveThumbnail(items[0]!)).toBeNull();
    expect(resolve).not.toHaveBeenCalled();
  });

  it('UT-NB-TH03: 解決失敗 → null (致命でない)', async () => {
    const resolve = vi.fn(async () => {
      throw new Error('signed url failed');
    });
    const items: Item[] = [{ id: 'd1', imageObjectKey: 'k1' }];
    const { result } = renderHook(() => useSignedThumbnails(items, { token: 't', resolve }));
    await waitFor(() => expect(resolve).toHaveBeenCalled());
    expect(result.current.resolveThumbnail(items[0]!)).toBeNull();
  });

  it('UT-NB-TH04: 同じ key は一度だけ取得する (dedupe)', async () => {
    const resolve = vi.fn(async (key: string) => `u/${key}`);
    const items: Item[] = [
      { id: 'd1', imageObjectKey: 'k1' },
      { id: 'd2', imageObjectKey: 'k1' },
    ];
    renderHook(() => useSignedThumbnails(items, { token: 't', resolve }));
    await waitFor(() => expect(resolve).toHaveBeenCalledTimes(1));
  });
});

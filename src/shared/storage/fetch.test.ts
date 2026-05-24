// @vitest-environment happy-dom
/**
 * fetch.ts 単体テスト (署名付き URL 取得 + useSignedUrl refetch/cleanup)
 * 由来: 003_storage_UNIT_TEST.md §1.3 (UT-ST-F01〜F06), §1.5 (E02)
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { getSignedUrl, getSignedUrls, useSignedUrl, SIGNED_URL_REFETCH_MS } from './fetch';

function urlResponse(url: string): Response {
  return new Response(JSON.stringify({ url }), { status: 200 });
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('getSignedUrl', () => {
  it('UT-ST-F01: 正常 → URL を返し objectKey を送る', async () => {
    const fetchFn = vi.fn<typeof fetch>().mockResolvedValue(urlResponse('https://signed/get'));
    const url = await getSignedUrl('u/d/i.webp', { token: 'tok', fetchFn });
    expect(url).toBe('https://signed/get');
    const body = JSON.parse((fetchFn.mock.calls[0]![1] as RequestInit).body as string);
    expect(body).toMatchObject({ objectKey: 'u/d/i.webp' });
  });

  it('UT-ST-F02: expiresIn=300 を body に含める', async () => {
    const fetchFn = vi.fn<typeof fetch>().mockResolvedValue(urlResponse('x'));
    await getSignedUrl('u/d/i.webp', { token: 'tok', expiresIn: 300, fetchFn });
    const body = JSON.parse((fetchFn.mock.calls[0]![1] as RequestInit).body as string);
    expect(body.expiresIn).toBe(300);
  });

  it('失敗ステータスは throw', async () => {
    const fetchFn = vi.fn<typeof fetch>().mockResolvedValue(new Response('no', { status: 403 }));
    await expect(getSignedUrl('u/d/i.webp', { token: 'tok', fetchFn })).rejects.toThrow();
  });
});

describe('getSignedUrls', () => {
  it('UT-ST-F03: batch → Record を返す', async () => {
    const urls = { 'u/d/a.webp': 'https://a', 'u/d/b.webp': 'https://b' };
    const fetchFn = vi
      .fn<typeof fetch>()
      .mockResolvedValue(new Response(JSON.stringify({ urls }), { status: 200 }));
    const out = await getSignedUrls(['u/d/a.webp', 'u/d/b.webp'], { token: 'tok', fetchFn });
    expect(out).toEqual(urls);
  });

  it('UT-ST-F04: 一部失敗 (server が除外) → 欠落 key は undefined', async () => {
    const urls = { 'u/d/a.webp': 'https://a' };
    const fetchFn = vi
      .fn<typeof fetch>()
      .mockResolvedValue(new Response(JSON.stringify({ urls }), { status: 200 }));
    const out = await getSignedUrls(['u/d/a.webp', 'u/d/b.webp'], { token: 'tok', fetchFn });
    expect(out['u/d/a.webp']).toBe('https://a');
    expect(out['u/d/b.webp']).toBeUndefined();
  });
});

describe('useSignedUrl', () => {
  it('UT-ST-F05: mount → URL 取得 + refetch interval を張る', async () => {
    const fetchFn = vi.fn<typeof fetch>().mockResolvedValue(urlResponse('https://signed/1'));
    const setIntervalSpy = vi.spyOn(globalThis, 'setInterval');

    const { result } = renderHook(() => useSignedUrl('u/d/i.webp', { token: 'tok', fetchFn }));

    await waitFor(() => expect(result.current).toBe('https://signed/1'));
    expect(fetchFn).toHaveBeenCalledTimes(1);
    expect(setIntervalSpy).toHaveBeenCalledWith(expect.any(Function), SIGNED_URL_REFETCH_MS);
  });

  it('UT-ST-F06: unmount で interval を cleanup する', async () => {
    const fetchFn = vi.fn<typeof fetch>().mockResolvedValue(urlResponse('https://x'));
    const clearIntervalSpy = vi.spyOn(globalThis, 'clearInterval');

    const { unmount, result } = renderHook(() => useSignedUrl('u/d/i.webp', { token: 'tok', fetchFn }));
    await waitFor(() => expect(result.current).toBe('https://x'));

    unmount();
    expect(clearIntervalSpy).toHaveBeenCalled();
  });

  it('UT-ST-E02: objectKey 変更で新 URL を fetch する', async () => {
    const fetchFn = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(urlResponse('https://a'))
      .mockResolvedValueOnce(urlResponse('https://b'));

    const { result, rerender } = renderHook(
      ({ key }: { key: string }) => useSignedUrl(key, { token: 'tok', fetchFn }),
      { initialProps: { key: 'u/d/a.webp' } },
    );
    await waitFor(() => expect(result.current).toBe('https://a'));

    rerender({ key: 'u/d/b.webp' });
    await waitFor(() => expect(result.current).toBe('https://b'));
    expect(fetchFn).toHaveBeenCalledTimes(2);
  });

  it('objectKey=null は fetch せず null を返す', () => {
    const fetchFn = vi.fn<typeof fetch>();
    const { result } = renderHook(() => useSignedUrl(null, { token: 'tok', fetchFn }));
    expect(result.current).toBeNull();
    expect(fetchFn).not.toHaveBeenCalled();
  });
});

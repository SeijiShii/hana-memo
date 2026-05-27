// @vitest-environment happy-dom
/**
 * billing/hooks.ts 単体テスト (useAiCredits / useIdentifyQuota)
 * 由来: docs/billing/003_billing_UNIT_TEST.md §1.3 (UT-BL-H01〜H02)
 */
import { describe, it, expect, vi } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { useAiCredits, useIdentifyQuota } from './hooks';

function jsonRes(body: unknown): Response {
  return { ok: true, status: 200, json: async () => body } as Response;
}

describe('useIdentifyQuota (fix_001)', () => {
  it('quotaRemaining を status から返す', async () => {
    const fetchFn = vi.fn<typeof fetch>(async () =>
      jsonRes({ aiCreditsRemaining: 0, quotaRemaining: 3 }),
    );
    const { result } = renderHook(() => useIdentifyQuota({ token: 't', fetchFn }));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.remaining).toBe(3);
  });

  it('quotaRemaining 欠落 (旧 server 互換) → remaining=null', async () => {
    const fetchFn = vi.fn<typeof fetch>(async () => jsonRes({ aiCreditsRemaining: 0 }));
    const { result } = renderHook(() => useIdentifyQuota({ token: 't', fetchFn }));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.remaining).toBeNull();
  });
});

describe('useAiCredits', () => {
  it('UT-BL-H01: 初回 mount → ai_credits_remaining を取得', async () => {
    const fetchFn = vi.fn<typeof fetch>(async () => jsonRes({ aiCreditsRemaining: 40 }));
    const { result } = renderHook(() => useAiCredits({ token: 't', fetchFn }));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.credits).toBe(40);
    expect(fetchFn).toHaveBeenCalledOnce();
  });

  it('UT-BL-H02: refresh() で最新値に re-render', async () => {
    const fetchFn = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(jsonRes({ aiCreditsRemaining: 40 }))
      .mockResolvedValueOnce(jsonRes({ aiCreditsRemaining: 60 }));
    const { result } = renderHook(() => useAiCredits({ token: 't', fetchFn }));
    await waitFor(() => expect(result.current.credits).toBe(40));
    await act(async () => {
      await result.current.refresh();
    });
    expect(result.current.credits).toBe(60);
  });

  it('error 時は error をセットし credits は null のまま', async () => {
    const fetchFn = vi.fn<typeof fetch>(async () => ({ ok: false, status: 500 }) as Response);
    const { result } = renderHook(() => useAiCredits({ token: 't', fetchFn }));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error).toBeInstanceOf(Error);
    expect(result.current.credits).toBeNull();
  });
});

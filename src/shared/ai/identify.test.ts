/**
 * identify.ts 単体テスト (frontend 同定ラッパ + 例外マッピング)
 * 由来: 003_ai_UNIT_TEST.md §1.1 (UT-AI-F01〜F06)
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { identifyPlant, retryIdentify } from './identify';
import { QuotaExceededError, AiServiceError, RateLimitedError } from './errors';
import { LinkRequiredError } from '../auth/errors';
import type { IdentifyInput, IdentifyResult } from '../types/ai';

const input: IdentifyInput = {
  discoveryId: 'd1',
  imageObjectKey: 'u1/d1/i1.webp',
  capturedAt: '2026-05-24T00:00:00Z',
  season: 'spring',
};

const RESULT: IdentifyResult = {
  commonName: 'タンポポ',
  scientificName: 'Taraxacum officinale',
  family: 'キク科',
  genus: 'Taraxacum',
  keyFeatures: ['黄色い花'],
  confidence: 0.82,
  similarSpecies: [],
  status: 'identified',
};

let errSpy: ReturnType<typeof vi.spyOn>;
beforeEach(() => {
  errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
});
afterEach(() => {
  errSpy.mockRestore();
});

describe('identifyPlant', () => {
  it('UT-AI-F01: 正常 → IdentifyResult + payload 送出', async () => {
    const fetchFn = vi
      .fn<typeof fetch>()
      .mockResolvedValue(new Response(JSON.stringify(RESULT), { status: 200 }));
    const r = await identifyPlant(input, { token: 'tok', fetchFn });
    expect(r).toEqual(RESULT);
    const body = JSON.parse((fetchFn.mock.calls[0]![1] as RequestInit).body as string);
    expect(body).toMatchObject({ discoveryId: 'd1', imageObjectKey: 'u1/d1/i1.webp', season: 'spring' });
  });

  it('UT-AI-F02: 402 → QuotaExceededError', async () => {
    const fetchFn = vi.fn<typeof fetch>().mockResolvedValue(new Response('no', { status: 402 }));
    await expect(identifyPlant(input, { token: 'tok', fetchFn })).rejects.toBeInstanceOf(
      QuotaExceededError,
    );
  });

  it('UT-AI-F03: 401 → LinkRequiredError', async () => {
    const fetchFn = vi.fn<typeof fetch>().mockResolvedValue(new Response('no', { status: 401 }));
    await expect(identifyPlant(input, { token: 'tok', fetchFn })).rejects.toBeInstanceOf(
      LinkRequiredError,
    );
  });

  it('UT-AI-F04: 5xx → AiServiceError', async () => {
    const fetchFn = vi.fn<typeof fetch>().mockResolvedValue(new Response('err', { status: 502 }));
    await expect(identifyPlant(input, { token: 'tok', fetchFn })).rejects.toBeInstanceOf(
      AiServiceError,
    );
  });

  it('UT-AI-F05: network throw → AiServiceError + console.error', async () => {
    const fetchFn = vi.fn<typeof fetch>().mockRejectedValue(new Error('network'));
    await expect(identifyPlant(input, { token: 'tok', fetchFn })).rejects.toBeInstanceOf(
      AiServiceError,
    );
    expect(errSpy).toHaveBeenCalled();
  });

  it('429 → RateLimitedError (retryAtMs を body から取得)', async () => {
    const fetchFn = vi
      .fn<typeof fetch>()
      .mockResolvedValue(new Response(JSON.stringify({ retryAtMs: 123 }), { status: 429 }));
    const err = await identifyPlant(input, { token: 'tok', fetchFn }).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(RateLimitedError);
    expect((err as RateLimitedError).retryAtMs).toBe(123);
  });
});

describe('retryIdentify', () => {
  it('UT-AI-F06: identifyPlant と同じ payload で再呼出する', async () => {
    const fetchFn = vi
      .fn<typeof fetch>()
      .mockResolvedValue(new Response(JSON.stringify(RESULT), { status: 200 }));
    await retryIdentify(input, { token: 'tok', fetchFn });
    const body = JSON.parse((fetchFn.mock.calls[0]![1] as RequestInit).body as string);
    expect(body).toMatchObject({ discoveryId: 'd1', imageObjectKey: 'u1/d1/i1.webp' });
  });
});

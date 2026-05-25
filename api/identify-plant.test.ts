/**
 * api/identify-plant.ts 単体テスト (body 正規化 + runIdentify オーケストレーション)
 * 由来: 003_ai_UNIT_TEST.md §1.2 (UT-AI-H), §1.4/§1.6 (SEC-001 含む)
 */
import { describe, it, expect, vi } from 'vitest';
import { parseIdentifyBody, runIdentify, type IdentifyDeps } from './identify-plant';
import { ValidationError } from '../src/shared/helpers/url';
import { RateLimitedError, QuotaExceededError, LinkRequiredError } from '../src/shared/ai/errors';
import type { PresignClient } from '../src/shared/storage/presign';

const validBody = {
  discoveryId: 'd1',
  imageObjectKey: 'u1/d1/i1.webp',
  capturedAt: '2026-05-24T00:00:00Z',
  season: 'spring',
};

const MODEL_JSON = {
  common_name: 'タンポポ',
  scientific_name: 'Taraxacum officinale',
  family: 'キク科',
  genus: 'Taraxacum',
  key_features: ['黄色い花', 'ロゼット葉'],
  confidence: 0.82,
  similar_species: [],
};

describe('parseIdentifyBody', () => {
  it('正常 body を正規化する', () => {
    expect(parseIdentifyBody(validBody)).toMatchObject({
      discoveryId: 'd1',
      imageObjectKey: 'u1/d1/i1.webp',
      season: 'spring',
    });
  });

  it('location / userNote を任意で取り込む', () => {
    const out = parseIdentifyBody({
      ...validBody,
      location: { lat: 35.6, lng: 139.7 },
      userNote: 'メモ',
    });
    expect(out.location).toEqual({ lat: 35.6, lng: 139.7 });
    expect(out.userNote).toBe('メモ');
  });

  it('必須欠落 / 不正 season は ValidationError', () => {
    expect(() =>
      parseIdentifyBody({ imageObjectKey: 'k', capturedAt: 'c', season: 'spring' }),
    ).toThrow(ValidationError);
    expect(() => parseIdentifyBody({ ...validBody, season: 'monsoon' })).toThrow(ValidationError);
  });
});

describe('runIdentify', () => {
  const userId = 'u1';
  const input = parseIdentifyBody(validBody);

  function presignMock(): PresignClient {
    return {
      presignPut: vi.fn(),
      presignGet: vi.fn().mockResolvedValue('https://signed/get'),
      deleteObject: vi.fn(),
    };
  }

  function makeDeps(overrides: Partial<IdentifyDeps> = {}): IdentifyDeps {
    return {
      rateLimiter: {
        limit: vi.fn().mockResolvedValue({ success: true, remaining: 9, resetAtMs: 0 }),
      },
      presign: presignMock(),
      complete: vi
        .fn()
        .mockResolvedValue({ choices: [{ message: { content: JSON.stringify(MODEL_JSON) } }] }),
      getQuota: vi.fn().mockResolvedValue({ remaining: 5, mustLink: false, consume: 'monthly' }),
      persist: vi.fn().mockResolvedValue(undefined),
      sleep: async () => {},
      ...overrides,
    };
  }

  it('正常フロー: rateLimit→ownership→quota→presign→OpenAI→parse→persist', async () => {
    const deps = makeDeps();
    const r = await runIdentify(userId, input, deps);

    expect(r.commonName).toBe('タンポポ');
    expect(r.status).toBe('identified');
    expect(deps.presign.presignGet).toHaveBeenCalledWith('u1/d1/i1.webp', expect.any(Number));
    expect(deps.persist).toHaveBeenCalledWith({
      discoveryId: 'd1',
      result: expect.objectContaining({ commonName: 'タンポポ', status: 'identified' }),
      consume: 'monthly',
    });
  });

  it('[SEC-001] レート制限超過 → RateLimitedError (presign/OpenAI 不実行)', async () => {
    const deps = makeDeps({
      rateLimiter: {
        limit: vi.fn().mockResolvedValue({ success: false, remaining: 0, resetAtMs: 123 }),
      },
    });
    await expect(runIdentify(userId, input, deps)).rejects.toBeInstanceOf(RateLimitedError);
    expect(deps.complete).not.toHaveBeenCalled();
    expect(deps.getQuota).not.toHaveBeenCalled();
  });

  it('他 user の objectKey → ValidationError (quota 消費前に拒否)', async () => {
    const otherInput = parseIdentifyBody({ ...validBody, imageObjectKey: 'other-user/d1/i1.webp' });
    const deps = makeDeps();
    await expect(runIdentify(userId, otherInput, deps)).rejects.toBeInstanceOf(ValidationError);
    expect(deps.getQuota).not.toHaveBeenCalled();
  });

  it('登録ユーザー quota 0 (mustLink=false) → QuotaExceededError 402 (OpenAI 不実行)', async () => {
    const deps = makeDeps({
      getQuota: vi.fn().mockResolvedValue({ remaining: 0, mustLink: false, consume: 'none' }),
    });
    await expect(runIdentify(userId, input, deps)).rejects.toBeInstanceOf(QuotaExceededError);
    expect(deps.complete).not.toHaveBeenCalled();
    expect(deps.persist).not.toHaveBeenCalled();
  });

  it('匿名 trial 使い切り (mustLink=true) → LinkRequiredError 401 (fix_001)', async () => {
    const deps = makeDeps({
      getQuota: vi.fn().mockResolvedValue({ remaining: 0, mustLink: true, consume: 'none' }),
    });
    await expect(runIdentify(userId, input, deps)).rejects.toBeInstanceOf(LinkRequiredError);
    expect(deps.complete).not.toHaveBeenCalled();
    expect(deps.persist).not.toHaveBeenCalled();
  });

  it('匿名 trial 残あり → consume=trial で persist (fix_001)', async () => {
    const deps = makeDeps({
      getQuota: vi.fn().mockResolvedValue({ remaining: 3, mustLink: false, consume: 'trial' }),
    });
    await runIdentify(userId, input, deps);
    expect(deps.persist).toHaveBeenCalledWith(expect.objectContaining({ consume: 'trial' }));
  });

  it('OpenAI 失敗 → retry 後に throw (persist せず)', async () => {
    const complete = vi.fn().mockRejectedValue(new Error('500 server error'));
    const deps = makeDeps({ complete });
    await expect(runIdentify(userId, input, deps)).rejects.toThrow();
    expect(complete.mock.calls.length).toBeGreaterThan(1); // retry した
    expect(deps.persist).not.toHaveBeenCalled();
  });
});

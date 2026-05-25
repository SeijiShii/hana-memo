import { describe, it, expect, vi } from 'vitest';
import {
  provisionGuest,
  GuestProvisionError,
  GUEST_FINGERPRINT_HARD_CAP,
  type ProvisionGuestDeps,
} from './guest-provision';

/** 既定で成功する deps を組み立てる (各テストで上書き)。 */
function makeDeps(over: Partial<ProvisionGuestDeps> = {}): ProvisionGuestDeps {
  return {
    checkRateLimit: vi.fn(async () => ({ success: true })),
    createUser: vi.fn(async () => ({ id: 'user_abc' })),
    upsertUser: vi.fn(async () => {}),
    createSignInToken: vi.fn(async () => ({ token: 'tkt_123' })),
    genExternalId: vi.fn(() => 'ext-uuid-1'),
    ...over,
  };
}

describe('provisionGuest', () => {
  it('UT-AU-GP01: 正常系 — createUser→upsert→token の順で ticket を返す', async () => {
    const deps = makeDeps();
    const out = await provisionGuest({ rateKey: 'guest:fp1', fingerprintHash: 'fp1' }, deps);
    expect(out).toEqual({ ticket: 'tkt_123' });
    expect(deps.checkRateLimit).toHaveBeenCalledWith('guest:fp1');
    expect(deps.createUser).toHaveBeenCalledTimes(1);
    expect(deps.upsertUser).toHaveBeenCalledWith({
      clerkUserId: 'user_abc',
      fingerprintHash: 'fp1',
    });
    expect(deps.createSignInToken).toHaveBeenCalledWith({
      userId: 'user_abc',
      expiresInSeconds: 600,
    });
  });

  it('UT-AU-GP02: createUser に externalId + publicMetadata.isAnonymous を付与', async () => {
    const createUser = vi.fn(async () => ({ id: 'u1' }));
    const deps = makeDeps({ createUser, genExternalId: () => 'ext-9' });
    await provisionGuest({ rateKey: 'k' }, deps);
    expect(createUser).toHaveBeenCalledWith({
      externalId: 'ext-9',
      publicMetadata: { isAnonymous: true },
    });
  });

  it('UT-AU-GP03: レート超過 — createUser を呼ばず GuestRateLimitedError(rate_limited)', async () => {
    const deps = makeDeps({ checkRateLimit: vi.fn(async () => ({ success: false })) });
    await expect(provisionGuest({ rateKey: 'k' }, deps)).rejects.toMatchObject({
      name: 'GuestRateLimitedError',
      status: 429,
      reason: 'rate_limited',
    });
    expect(deps.createUser).not.toHaveBeenCalled();
  });

  it('UT-AU-GP04: createUser 失敗 — token を呼ばず GuestProvisionError(503)', async () => {
    const createSignInToken = vi.fn(async () => ({ token: 'x' }));
    const deps = makeDeps({
      createUser: vi.fn(async () => {
        throw new Error('clerk 500');
      }),
      createSignInToken,
    });
    await expect(provisionGuest({ rateKey: 'k' }, deps)).rejects.toBeInstanceOf(
      GuestProvisionError,
    );
    expect(createSignInToken).not.toHaveBeenCalled();
  });

  it('UT-AU-GP04b: token 発行失敗 — GuestProvisionError(503)', async () => {
    const deps = makeDeps({
      createSignInToken: vi.fn(async () => {
        throw new Error('token fail');
      }),
    });
    await expect(provisionGuest({ rateKey: 'k' }, deps)).rejects.toMatchObject({ status: 503 });
  });

  it('UT-AU-GP05: fingerprint cap 到達 — must_link で 429、createUser 呼ばれない', async () => {
    const deps = makeDeps({
      countByFingerprint: vi.fn(async () => GUEST_FINGERPRINT_HARD_CAP),
    });
    await expect(
      provisionGuest({ rateKey: 'k', fingerprintHash: 'fp-heavy' }, deps),
    ).rejects.toMatchObject({ name: 'GuestRateLimitedError', reason: 'must_link' });
    expect(deps.createUser).not.toHaveBeenCalled();
  });

  it('UT-AU-GP05b: cap 未満なら通常発行', async () => {
    const deps = makeDeps({
      countByFingerprint: vi.fn(async () => 3),
      fingerprintHardCap: 100,
    });
    const out = await provisionGuest({ rateKey: 'k', fingerprintHash: 'fp' }, deps);
    expect(out.ticket).toBe('tkt_123');
  });

  it('fingerprint 無し時は countByFingerprint を呼ばない', async () => {
    const countByFingerprint = vi.fn(async () => 999);
    const deps = makeDeps({ countByFingerprint });
    await provisionGuest({ rateKey: 'k' }, deps);
    expect(countByFingerprint).not.toHaveBeenCalled();
  });
});

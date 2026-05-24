/**
 * spam-guard.ts 単体テスト (fingerprint + trial 遠隔判定)
 * 由来: 003_auth_UNIT_TEST.md §1.3 (UT-AU-G01/G02/G06/G07)
 */
import { describe, it, expect, vi } from 'vitest';
import { getFingerprint, enforceTrialLimitRemote } from './spam-guard';
import { LinkRequiredError } from './errors';
import type { TrialQuota } from './trial';

describe('getFingerprint', () => {
  it('UT-AU-G01: fingerprintjs visitorId を hash して返す', async () => {
    const load = vi.fn(async () => ({ get: async () => ({ visitorId: 'visitor-123' }) }));
    const hash = vi.fn(async (s: string) => `hash(${s})`);
    const fp = await getFingerprint({ load, hash });
    expect(load).toHaveBeenCalledOnce();
    expect(hash).toHaveBeenCalledWith('visitor-123');
    expect(fp).toBe('hash(visitor-123)');
  });

  it('UT-AU-G02: fingerprintjs 失敗時は弱 fingerprint に fallback + warn', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const load = vi.fn(async () => {
      throw new Error('blocked');
    });
    const hash = vi.fn(async (s: string) => `hash(${s})`);
    const fp = await getFingerprint({ load, hash });
    expect(warn).toHaveBeenCalled();
    expect(hash).toHaveBeenCalledTimes(1);
    expect(fp.startsWith('hash(weak:')).toBe(true);
    warn.mockRestore();
  });
});

describe('enforceTrialLimitRemote', () => {
  const okQuota: TrialQuota = { used: 1, max: 3, remaining: 2, mustLink: false };

  function mockFetch(body: unknown, ok = true, status = 200): typeof fetch {
    return vi.fn(async () => ({
      ok,
      status,
      json: async () => body,
    })) as unknown as typeof fetch;
  }

  it('UT-AU-G07: 範囲内なら quota を返す (throw しない)', async () => {
    const quota = await enforceTrialLimitRemote({
      token: 't',
      fingerprint: 'fp',
      fetchFn: mockFetch(okQuota),
    });
    expect(quota).toEqual(okQuota);
  });

  it('UT-AU-G06: mustLink=true なら LinkRequiredError を throw', async () => {
    const blocked: TrialQuota = { used: 3, max: 3, remaining: 0, mustLink: true };
    await expect(
      enforceTrialLimitRemote({ token: 't', fingerprint: 'fp', fetchFn: mockFetch(blocked) }),
    ).rejects.toBeInstanceOf(LinkRequiredError);
  });

  it('HTTP エラーは Error を throw', async () => {
    await expect(
      enforceTrialLimitRemote({
        token: 't',
        fingerprint: 'fp',
        fetchFn: mockFetch({}, false, 500),
      }),
    ).rejects.toThrow(/spam-check failed: 500/);
  });

  it('Authorization ヘッダと fingerprint body を送る', async () => {
    const fetchFn = mockFetch(okQuota);
    await enforceTrialLimitRemote({ token: 'tok', fingerprint: 'fp1', fetchFn });
    expect(fetchFn).toHaveBeenCalledWith(
      '/api/auth/spam-check',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({ authorization: 'Bearer tok' }),
        body: JSON.stringify({ fingerprint: 'fp1' }),
      }),
    );
  });
});

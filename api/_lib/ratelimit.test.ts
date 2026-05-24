/**
 * api/_lib/ratelimit.ts 単体テスト (Upstash config + RateLimiter 適合)
 * [SEC-001] の判定値マッピングを検証。実 Upstash 接続は E2E。
 */
import { describe, it, expect, vi } from 'vitest';
import { loadUpstashConfig, toRateLimiter, type UpstashLimiter } from './ratelimit';

describe('loadUpstashConfig', () => {
  it('env から url/token を読み出す', () => {
    const cfg = loadUpstashConfig({
      UPSTASH_REDIS_REST_URL: 'https://x.upstash.io',
      UPSTASH_REDIS_REST_TOKEN: 'tok',
    } as unknown as NodeJS.ProcessEnv);
    expect(cfg).toEqual({ url: 'https://x.upstash.io', token: 'tok' });
  });

  it('不足で throw', () => {
    expect(() => loadUpstashConfig({} as unknown as NodeJS.ProcessEnv)).toThrow(/Upstash config missing/);
  });
});

describe('toRateLimiter', () => {
  it('upstash result を RateLimitResult に適合する (reset→resetAtMs)', async () => {
    const upstash: UpstashLimiter = {
      limit: vi.fn().mockResolvedValue({ success: true, remaining: 9, reset: 123456 }),
    };
    const rl = toRateLimiter(upstash);
    const r = await rl.limit('identify:u1');
    expect(r).toEqual({ success: true, remaining: 9, resetAtMs: 123456 });
    expect(upstash.limit).toHaveBeenCalledWith('identify:u1');
  });

  it('success=false を伝播する', async () => {
    const upstash: UpstashLimiter = {
      limit: vi.fn().mockResolvedValue({ success: false, remaining: 0, reset: 999 }),
    };
    const r = await toRateLimiter(upstash).limit('k');
    expect(r.success).toBe(false);
    expect(r.resetAtMs).toBe(999);
  });
});

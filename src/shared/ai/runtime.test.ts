/**
 * quota.ts + rate-limit.ts + retry.ts 単体テスト
 * 由来: 003_ai_UNIT_TEST.md §1.5 (O01〜O05) + §1.6 (Q01〜Q04) + revise §7.1 (rate limit)
 */
import { describe, it, expect, vi } from "vitest";
import { checkQuota, consumeQuota } from "./quota";
import {
  checkIdentifyRateLimit,
  identifyRateLimitKey,
  IDENTIFY_RATE_LIMIT,
  type RateLimiter,
} from "./rate-limit";
import { withRetry, BACKOFF_MS } from "./retry";
import { QuotaExceededError, AfterRetryError } from "./errors";

describe("quota", () => {
  it("UT-AI-Q01: 残あり → {ok:true, remaining:N}", () => {
    expect(checkQuota(3)).toEqual({ ok: true, remaining: 3 });
  });
  it("UT-AI-Q02: 残 0 → {ok:false}", () => {
    expect(checkQuota(0)).toEqual({ ok: false, remaining: 0 });
  });
  it("UT-AI-Q03: consume 正常 → -1", () => {
    expect(consumeQuota(3)).toBe(2);
  });
  it("UT-AI-Q04: consume 0 から → QuotaExceededError", () => {
    expect(() => consumeQuota(0)).toThrow(QuotaExceededError);
  });
});

describe("rate-limit ([SEC-001])", () => {
  it("IDENTIFY_RATE_LIMIT は 10/min、key は identify:uid", () => {
    expect(IDENTIFY_RATE_LIMIT).toEqual({ limit: 10, windowSec: 60 });
    expect(identifyRateLimitKey("user_abc")).toBe("identify:user_abc");
  });

  it("success → throw しない", async () => {
    const limiter: RateLimiter = {
      limit: vi.fn(() =>
        Promise.resolve({ success: true, remaining: 9, resetAtMs: 0 }),
      ),
    };
    await expect(
      checkIdentifyRateLimit(limiter, "user_abc"),
    ).resolves.toBeUndefined();
  });

  it("!success → RateLimitedError (retryAtMs)", async () => {
    const limiter: RateLimiter = {
      limit: vi.fn(() =>
        Promise.resolve({ success: false, remaining: 0, resetAtMs: 12345 }),
      ),
    };
    await expect(
      checkIdentifyRateLimit(limiter, "user_abc"),
    ).rejects.toMatchObject({
      name: "RateLimitedError",
      retryAtMs: 12345,
    });
  });
});

describe("withRetry", () => {
  it("UT-AI-O01: 1 回成功 → retry なし、sleep 呼ばれない", async () => {
    const sleep = vi.fn(() => Promise.resolve());
    const fn = vi.fn(() => Promise.resolve("ok"));
    await expect(withRetry(fn, { sleep })).resolves.toBe("ok");
    expect(fn).toHaveBeenCalledTimes(1);
    expect(sleep).not.toHaveBeenCalled();
  });

  it("UT-AI-O02: 1 回失敗 → 2 回目成功、sleep(1000) 1 回", async () => {
    const sleep = vi.fn(() => Promise.resolve());
    const fn = vi
      .fn()
      .mockRejectedValueOnce(new Error("500"))
      .mockResolvedValueOnce("ok");
    await expect(withRetry(fn, { sleep })).resolves.toBe("ok");
    expect(fn).toHaveBeenCalledTimes(2);
    expect(sleep).toHaveBeenCalledTimes(1);
    expect(sleep).toHaveBeenCalledWith(BACKOFF_MS[0]);
  });

  it("UT-AI-O03: 全失敗 → AfterRetryError、fn=maxRetries+1 回", async () => {
    const sleep = vi.fn(() => Promise.resolve());
    const fn = vi.fn(() => Promise.reject(new Error("500")));
    await expect(withRetry(fn, { sleep, maxRetries: 2 })).rejects.toThrow(
      AfterRetryError,
    );
    expect(fn).toHaveBeenCalledTimes(3); // 初回 + 2 retry
    expect(sleep).toHaveBeenCalledTimes(2);
  });

  it("UT-AI-O04: 429 → 5s wait → 成功 (custom backoff)", async () => {
    const sleep = vi.fn(() => Promise.resolve());
    const fn = vi
      .fn()
      .mockRejectedValueOnce(new Error("429"))
      .mockResolvedValueOnce("ok");
    await expect(withRetry(fn, { sleep, backoffMs: [5000] })).resolves.toBe(
      "ok",
    );
    expect(sleep).toHaveBeenCalledTimes(1);
    expect(sleep).toHaveBeenCalledWith(5000);
  });

  it("UT-AI-O05: non-retryable (401) → 即 throw 元エラー、retry なし", async () => {
    const sleep = vi.fn(() => Promise.resolve());
    const err = new Error("401");
    const fn = vi.fn(() => Promise.reject(err));
    await expect(
      withRetry(fn, { sleep, isRetryable: () => false }),
    ).rejects.toBe(err);
    expect(fn).toHaveBeenCalledTimes(1);
    expect(sleep).not.toHaveBeenCalled();
  });

  it("sleep 未注入 → デフォルト setTimeout で実際に待つ", async () => {
    const fn = vi
      .fn()
      .mockRejectedValueOnce(new Error("500"))
      .mockResolvedValueOnce("ok");
    await expect(withRetry(fn, { backoffMs: [1] })).resolves.toBe("ok");
    expect(fn).toHaveBeenCalledTimes(2);
  });
});

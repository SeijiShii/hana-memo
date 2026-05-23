/**
 * cost.ts 単体テスト
 *
 * 由来: 003_analytics_UNIT_TEST.md §1.1 (UT-AN-C01〜C06) + §1.4 (E01〜E02)
 *
 * 注: client.ts は DATABASE_URL 未設定で module-load 時に throw するため vi.mock で無効化し、
 *     各関数には DI 経由でモック db を渡してアサートする。
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

vi.mock("../db/client", () => ({ db: {} }));

import {
  logApiUsage,
  estimateCost,
  getMonthlyUsage,
  refreshMonthlyMatview,
  type CostDb,
} from "./cost";
import type { CostLogEntry } from "../types/analytics";

function makeInsertDb(behavior: "ok" | "fail") {
  const values = vi.fn(() =>
    behavior === "ok"
      ? Promise.resolve()
      : Promise.reject(new Error("db down")),
  );
  const insert = vi.fn(() => ({ values }));
  const execute = vi.fn(() => Promise.resolve([]));
  return {
    db: { insert, execute } as unknown as CostDb,
    insert,
    values,
    execute,
  };
}

const baseEntry: CostLogEntry = {
  userId: "user_abc",
  service: "openai",
  endpoint: "/api/identify",
  inputTokens: 1000,
  outputTokens: 500,
  imageCount: 1,
  success: true,
  latencyMs: 800,
};

describe("logApiUsage", () => {
  let errorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("UT-AN-C01: 正常系 → api_usage に 1 件 INSERT", async () => {
    const { db, insert, values } = makeInsertDb("ok");
    await logApiUsage(baseEntry, db);
    expect(insert).toHaveBeenCalledTimes(1);
    expect(values).toHaveBeenCalledTimes(1);
    expect(values).toHaveBeenCalledWith(
      expect.objectContaining({
        service: "openai",
        endpoint: "/api/identify",
        success: true,
      }),
    );
  });

  it("UT-AN-C02: INSERT 失敗 → retry 後 fail-soft (resolve + console.error 1 回)", async () => {
    const { db, values } = makeInsertDb("fail");
    await expect(logApiUsage(baseEntry, db)).resolves.toBeUndefined();
    expect(values).toHaveBeenCalledTimes(2); // 初回 + retry 1
    expect(errorSpy).toHaveBeenCalledTimes(1);
  });

  it("UT-AN-E01: 他 user の userId でも fail-soft (本処理継続)", async () => {
    const { db } = makeInsertDb("fail");
    await expect(
      logApiUsage({ ...baseEntry, userId: "user_other" }, db),
    ).resolves.toBeUndefined();
    expect(errorSpy).toHaveBeenCalledTimes(1);
  });

  it("任意フィールド省略時は null / 0 で埋めて INSERT", async () => {
    const { db, values } = makeInsertDb("ok");
    await logApiUsage({ service: "r2", endpoint: "/put", success: false }, db);
    expect(values).toHaveBeenCalledWith({
      userId: null,
      service: "r2",
      endpoint: "/put",
      inputTokens: 0,
      outputTokens: 0,
      imageCount: 0,
      success: false,
      latencyMs: null,
    });
  });

  it("service 空 → reject (TypeError)", async () => {
    const { db } = makeInsertDb("ok");
    await expect(
      logApiUsage({ ...baseEntry, service: "" }, db),
    ).rejects.toThrow(TypeError);
  });

  it("負のトークン → reject (TypeError)", async () => {
    const { db } = makeInsertDb("ok");
    await expect(
      logApiUsage({ ...baseEntry, inputTokens: -1 }, db),
    ).rejects.toThrow(TypeError);
  });
});

describe("estimateCost", () => {
  let warnSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.stubEnv("COST_OPENAI_GPT4O_MINI_PER_1K_INPUT_TOKENS", "0.00015");
    vi.stubEnv("COST_OPENAI_GPT4O_MINI_PER_1K_OUTPUT_TOKENS", "0.0006");
    vi.stubEnv("COST_OPENAI_GPT4O_MINI_PER_IMAGE", "0.001");
  });
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it("UT-AN-C03: gpt-4o-mini input=1000 output=500 image=1 → ≒ 0.00145 USD", () => {
    expect(estimateCost(baseEntry)).toBeCloseTo(0.00145, 6);
  });

  it("UT-AN-C04: 未登録 service → NaN + console.warn", () => {
    expect(estimateCost({ ...baseEntry, service: "unknown" })).toBeNaN();
    expect(warnSpy).toHaveBeenCalledTimes(1);
  });

  it("UT-AN-E02: 全ゼロ → 0 USD", () => {
    expect(
      estimateCost({
        ...baseEntry,
        inputTokens: 0,
        outputTokens: 0,
        imageCount: 0,
      }),
    ).toBe(0);
  });

  it("COST_OPENAI_* env 未設定 → NaN + console.warn", () => {
    vi.unstubAllEnvs();
    expect(estimateCost(baseEntry)).toBeNaN();
    expect(warnSpy).toHaveBeenCalledTimes(1);
  });
});

describe("getMonthlyUsage", () => {
  it("UT-AN-C05: matview 行を集計して UsageSummary を返す", async () => {
    const execute = vi.fn(() =>
      Promise.resolve([
        {
          service: "openai",
          call_count: 8,
          input_tokens: 8000,
          output_tokens: 4000,
          image_count: 8,
          estimated_cost_usd: 0.0116,
        },
        {
          service: "r2",
          call_count: 2,
          input_tokens: 0,
          output_tokens: 0,
          image_count: 0,
          estimated_cost_usd: 0.0003,
        },
      ]),
    );
    const db = { execute } as unknown as CostDb;
    const summary = await getMonthlyUsage("user_abc", "2026-05", db);
    expect(summary).toMatchObject({
      yearMonth: "2026-05",
      userId: "user_abc",
      service: "all",
      callCount: 10,
      inputTokens: 8000,
      outputTokens: 4000,
      imageCount: 8,
    });
    expect(summary.estimatedCostUsd).toBeCloseTo(0.0119, 6);
  });

  it("行なし → ゼロ集計", async () => {
    const db = {
      execute: vi.fn(() => Promise.resolve({ rows: [] })),
    } as unknown as CostDb;
    const summary = await getMonthlyUsage("user_abc", "2026-05", db);
    expect(summary.callCount).toBe(0);
    expect(summary.estimatedCostUsd).toBe(0);
  });

  it("execute が想定外形 (配列でも {rows} でもない) → ゼロ集計", async () => {
    const db = {
      execute: vi.fn(() => Promise.resolve(undefined)),
    } as unknown as CostDb;
    const summary = await getMonthlyUsage("user_abc", "2026-05", db);
    expect(summary.callCount).toBe(0);
  });
});

describe("refreshMonthlyMatview", () => {
  it("UT-AN-C06: 成功 → resolve + execute 呼出", async () => {
    const execute = vi.fn(() => Promise.resolve());
    const db = { execute } as unknown as CostDb;
    await expect(refreshMonthlyMatview(db)).resolves.toBeUndefined();
    expect(execute).toHaveBeenCalledTimes(1);
  });
});

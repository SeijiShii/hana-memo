/**
 * slack.ts 単体テスト ([SEC-004] Slack 通知の PII スクラブ)
 *
 * 由来: revise_sec_004_sentry_pii_scrub_20260523/003_REVISE_UNIT_TEST.md §1.3
 *      003_analytics_UNIT_TEST.md §1.3 (UT-AN-Q06)
 */
import { describe, it, expect, vi, afterEach } from "vitest";
import { buildSlackPayload, notifySlack } from "./slack";

afterEach(() => vi.restoreAllMocks());

describe("buildSlackPayload", () => {
  it("UT-AN-CHECKQUOTA-PII-01: email を含む通知文を scrub", () => {
    expect(buildSlackPayload("User x@y.com over 80%")).toEqual({
      text: "User ***@*** over 80%",
    });
  });

  it("UT-AN-CHECKQUOTA-PII-02: 集計サマリ (PII なし) は不変", () => {
    expect(buildSlackPayload("5 users over 80%, total cost $12.50")).toEqual({
      text: "5 users over 80%, total cost $12.50",
    });
  });

  it("UT-AN-EXPORTREV-PII-01: CSV パスを含む通知文 (PII なし) は不変", () => {
    expect(
      buildSlackPayload("Revenue exported: exports/revenue_202605.csv"),
    ).toEqual({
      text: "Revenue exported: exports/revenue_202605.csv",
    });
  });
});

describe("notifySlack", () => {
  it("scrub 済み body を POST して true を返す", async () => {
    const fetchImpl = vi.fn(
      (
        _url: string,
        _init: {
          method: string;
          headers: Record<string, string>;
          body: string;
        },
      ) => Promise.resolve({ ok: true, status: 200 }),
    );
    const ok = await notifySlack(
      "https://hooks.slack.com/x",
      "User a@b.com over quota",
      fetchImpl,
    );
    expect(ok).toBe(true);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    const body = JSON.parse(fetchImpl.mock.calls[0]![1].body);
    expect(body.text).toBe("User ***@*** over quota");
    expect(body.text).not.toContain("a@b.com");
  });

  it("UT-AN-Q06: webhook URL 未設定 → console.warn + skip (false)", async () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const fetchImpl = vi.fn(() => Promise.resolve({ ok: true, status: 200 }));
    const ok = await notifySlack(undefined, "anything", fetchImpl);
    expect(ok).toBe(false);
    expect(fetchImpl).not.toHaveBeenCalled();
    expect(warnSpy).toHaveBeenCalledTimes(1);
  });
});

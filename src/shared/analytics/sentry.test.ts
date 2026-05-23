/**
 * sentry.ts 単体テスト ([SEC-004] beforeSend スクラブ + opt-in ゲート + uid hash 化)
 *
 * 由来: revise_sec_004_sentry_pii_scrub_20260523/003_REVISE_UNIT_TEST.md §1.2 (UT-AN-SENTRY-01〜05)
 */
import { describe, it, expect } from "vitest";
import {
  initSentry,
  captureException,
  type SentryLike,
  type SentryInitOptions,
} from "./sentry";
import { sha256Hex } from "../helpers/id";

function makeFakeClient() {
  const initCalls: SentryInitOptions[] = [];
  const captureCalls: {
    err: unknown;
    hint?: { extra?: Record<string, unknown> };
  }[] = [];
  const client: SentryLike = {
    init: (o) => initCalls.push(o),
    captureException: (err, hint) => captureCalls.push({ err, hint }),
  };
  return { client, initCalls, captureCalls };
}

describe("initSentry", () => {
  it("UT-AN-SENTRY-01: analytics_opt_in=false → init を呼ばない", async () => {
    const { client, initCalls } = makeFakeClient();
    await initSentry(
      { id: "user_abc", analyticsOptIn: false },
      { dsn: "https://x@y/1" },
      client,
    );
    expect(initCalls).toHaveLength(0);
  });

  it("UT-AN-SENTRY-02: opt_in=true → beforeSend / beforeBreadcrumb / initialScope 付きで init", async () => {
    const { client, initCalls } = makeFakeClient();
    await initSentry(
      { id: "user_abc", analyticsOptIn: true },
      { dsn: "https://x@y/1" },
      client,
    );
    expect(initCalls).toHaveLength(1);
    const o = initCalls[0]!;
    expect(typeof o.beforeSend).toBe("function");
    expect(typeof o.beforeBreadcrumb).toBe("function");
    expect(o.initialScope.user.id).toBeTypeOf("string");
    expect(o.dsn).toBe("https://x@y/1");
  });

  it("UT-AN-SENTRY-03: beforeSend が event.exception の PII を mask", async () => {
    const { client, initCalls } = makeFakeClient();
    await initSentry(
      { id: "user_abc", analyticsOptIn: true },
      { dsn: "d" },
      client,
    );
    const event = { exception: { values: [{ value: "email: a@b.com" }] } };
    const scrubbed = initCalls[0]!.beforeSend(event);
    expect(scrubbed?.exception?.values?.[0]?.value).toBe("email: ***@***");
  });

  it("UT-AN-SENTRY-04: beforeBreadcrumb が message の Clerk uid を mask", async () => {
    const { client, initCalls } = makeFakeClient();
    await initSentry(
      { id: "user_abc", analyticsOptIn: true },
      { dsn: "d" },
      client,
    );
    const crumb = initCalls[0]!.beforeBreadcrumb({ message: "user_abc登録" });
    expect(crumb?.message).toBe("<clerk_uid>登録");
  });

  it("UT-AN-SENTRY-05: initialScope.user.id は SHA-256 hash (raw Clerk uid ではない)", async () => {
    const { client, initCalls } = makeFakeClient();
    await initSentry(
      { id: "user_abc", analyticsOptIn: true },
      { dsn: "d" },
      client,
    );
    const id = initCalls[0]!.initialScope.user.id;
    expect(id).toBe(await sha256Hex("user_abc"));
    expect(id).toMatch(/^[0-9a-f]{64}$/);
    expect(id).not.toContain("user_"); // clerk_uid パターンに非合致
  });
});

describe("captureException", () => {
  it("context を scrub して extra に載せる", () => {
    const { client, captureCalls } = makeFakeClient();
    captureException(new Error("boom"), { email: "a@b.com", n: 1 }, client);
    expect(captureCalls).toHaveLength(1);
    expect(captureCalls[0]!.hint?.extra).toEqual({ email: "***@***", n: 1 });
  });

  it("context なし → hint は undefined、err はそのまま転送", () => {
    const { client, captureCalls } = makeFakeClient();
    const err = new Error("plain");
    captureException(err, undefined, client);
    expect(captureCalls[0]!.err).toBe(err);
    expect(captureCalls[0]!.hint).toBeUndefined();
  });
});

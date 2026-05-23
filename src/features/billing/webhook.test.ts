/**
 * webhook.ts 単体テスト (Stripe → billing_unlocks べき等性、[SEC-006])
 * 由来: 003_billing_UNIT_TEST.md §1.2 (WH01/WH02/WH03/WH05/WH06)
 */
import { describe, it, expect, vi } from "vitest";
import {
  mapStripeEvent,
  applyBillingWebhook,
  type BillingStore,
  type StripeCheckoutEvent,
} from "./webhook";

function event(
  over: Partial<StripeCheckoutEvent["data"]["object"]> & {
    id?: string;
    type?: string;
  } = {},
): StripeCheckoutEvent {
  const { id = "evt_1", type = "checkout.session.completed", ...obj } = over;
  return {
    id,
    type,
    data: {
      object: {
        id: "cs_1",
        payment_intent: "pi_1",
        amount_total: 200,
        metadata: { userId: "user_1", type: "ai_credits", quantity: "2" },
        ...obj,
      },
    },
  };
}

describe("mapStripeEvent", () => {
  it("WH01: ai_credits qty=2 → grantCredits 40", () => {
    const op = mapStripeEvent(event());
    expect(op).toMatchObject({
      op: "grantCredits",
      userId: "user_1",
      sessionId: "cs_1",
      credits: 40,
    });
  });
  it("WH02: pdf_unlock → unlockPdf", () => {
    const op = mapStripeEvent(
      event({ metadata: { userId: "user_1", type: "pdf_unlock" } }),
    );
    expect(op).toMatchObject({ op: "unlockPdf", userId: "user_1" });
  });
  it("WH05: 不明 event type → ignore", () => {
    expect(mapStripeEvent(event({ type: "payment_intent.created" })).op).toBe(
      "ignore",
    );
  });
  it("WH06: metadata.userId 欠落 → ignore", () => {
    expect(mapStripeEvent(event({ metadata: { type: "ai_credits" } })).op).toBe(
      "ignore",
    );
  });
  it("未知の metadata.type → ignore", () => {
    expect(
      mapStripeEvent(
        event({ metadata: { userId: "user_1", type: "donation" } }),
      ).op,
    ).toBe("ignore");
  });

  it("quantity 欠落 → デフォルト 1 (credits 20)", () => {
    const op = mapStripeEvent(
      event({ metadata: { userId: "user_1", type: "ai_credits" } }),
    );
    expect(op).toMatchObject({ op: "grantCredits", credits: 20 });
  });

  it("amount_total / payment_intent 欠落 → 0 / null フォールバック", () => {
    const op = mapStripeEvent(
      event({
        amount_total: null,
        payment_intent: null,
        metadata: { userId: "user_1", type: "pdf_unlock" },
      }),
    );
    expect(op).toMatchObject({
      op: "unlockPdf",
      amountJpy: 0,
      paymentIntent: null,
    });
  });

  it("quantity 非整数 → 1 にフォールバック", () => {
    const op = mapStripeEvent(
      event({
        metadata: { userId: "user_1", type: "ai_credits", quantity: "abc" },
      }),
    );
    expect(op).toMatchObject({ op: "grantCredits", credits: 20 });
  });
});

function makeStore(processed = false) {
  const spies = {
    isEventProcessed: vi.fn(() => Promise.resolve(processed)),
    recordEvent: vi.fn(() => Promise.resolve()),
    insertUnlock: vi.fn(() => Promise.resolve()),
    grantCredits: vi.fn(() => Promise.resolve()),
    setPdfUnlocked: vi.fn(() => Promise.resolve()),
  };
  return { store: spies as unknown as BillingStore, spies };
}

describe("applyBillingWebhook", () => {
  it("WH01: ai_credits → insertUnlock + grantCredits(40) + recordEvent", async () => {
    const { store, spies } = makeStore();
    const res = await applyBillingWebhook(store, event());
    expect(res.applied).toBe(true);
    expect(spies.insertUnlock).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: "user_1",
        type: "ai_credits",
        sessionId: "cs_1",
      }),
    );
    expect(spies.grantCredits).toHaveBeenCalledWith("user_1", 40);
    expect(spies.recordEvent).toHaveBeenCalledWith("evt_1", "stripe");
  });

  it("WH02: pdf_unlock → setPdfUnlocked", async () => {
    const { store, spies } = makeStore();
    await applyBillingWebhook(
      store,
      event({ metadata: { userId: "user_1", type: "pdf_unlock" } }),
    );
    expect(spies.setPdfUnlocked).toHaveBeenCalledWith("user_1");
    expect(spies.grantCredits).not.toHaveBeenCalled();
  });

  it("UT-BL-WH03: 処理済み event → applied=false (べき等性)", async () => {
    const { store, spies } = makeStore(true);
    const res = await applyBillingWebhook(store, event());
    expect(res.applied).toBe(false);
    expect(spies.insertUnlock).not.toHaveBeenCalled();
    expect(spies.grantCredits).not.toHaveBeenCalled();
  });

  it("ignore event → unlock せず recordEvent のみ", async () => {
    const { store, spies } = makeStore();
    const res = await applyBillingWebhook(
      store,
      event({ type: "payment_intent.created" }),
    );
    expect(res.applied).toBe(false);
    expect(spies.insertUnlock).not.toHaveBeenCalled();
    expect(spies.recordEvent).toHaveBeenCalledWith("evt_1", "stripe");
  });
});

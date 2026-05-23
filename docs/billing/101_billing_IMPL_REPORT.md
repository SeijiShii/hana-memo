# 実装レポート: billing (UI 非依存コア)

## 実装日時
2026-05-23 18:16 (JST)

## モード
feature — **UI 非依存の課金ドメインロジックのみ実装**。Stripe SDK (checkout/webhook 署名検証) + Vercel Function + React UI は app bootstrap フェーズへ defer。

## 関連ドキュメント
- [001_billing_SPEC.md](./001_billing_SPEC.md) / [002_billing_PLAN.md](./002_billing_PLAN.md) / [003_billing_UNIT_TEST.md](./003_billing_UNIT_TEST.md)
- [AI_LOG](../AI_LOG/D20260523_037_tdd_billing.md)

## 変更一覧

### 実装 (純関数 + DI)
- `src/features/billing/errors.ts` (新規): `BillingError` / `InvalidAmountError`。
- `src/features/billing/pricing.ts` (新規): `validateQuantity` (1-10) / `validatePwywAmount` (100-10000) / `aiCreditsAmountJpy` (¥100×qty) / `aiCreditsGranted` (20×qty) / `requireLinked` (匿名は auth `LinkRequiredError`)。
- `src/features/billing/webhook.ts` (新規): `mapStripeEvent` (checkout.session.completed→grantCredits/unlockPdf/ignore) + `applyBillingWebhook` (BillingStore DI、webhook_dedupe べき等性 [SEC-006])。
- `src/features/billing/revenue.ts` (新規): `grossMargin` ((net-cost)/net) + `buildRevenueCsv` (列順固定、UC5)。
- `src/features/billing/index.ts` (新規): barrel。

## 実装計画からの差分

| 項目 | 内容 |
|------|------|
| 計画にない追加変更 | webhook を BillingStore DI + idempotent apply に切り出し ([SEC-006] webhook_dedupe + sessionId UNIQUE をストア境界で表現)。 |
| 計画から省略した変更 | **defer (app bootstrap)**: `create-checkout-session`/`stripe-webhook` Vercel Function (Stripe SDK + Stripe-Signature 検証、UT-BL-CS07/WH04/WH07)、`useAiCredits`/`usePdfUnlocked` hook + checkoutApi + successConfirm poll + OAuthRequiredModal (UT-BL-H/A/SC/OM)、`export-revenue` の実 Storage 保存 + Slack 送信 (UT-BL-ER01/ER02/ER06、Slack scrub は `_shared/analytics slack.ts` 実装済)。 |
| 想定外の問題と対処 | quantity 非整数 / amount_total・payment_intent 欠落のフォールバックを mapStripeEvent に実装 (Stripe metadata は string、堅牢性確保)。 |

## PR Description

### タイトル
billing: 課金ドメインロジック (価格検証 + Stripe webhook べき等性 + 収益集計)

### 概要
課金機能のうち UI 非依存のロジック (AI クレジット/PWYW 価格・数量検証、OAuth 必須ガード、Stripe webhook の event mapping + べき等適用、月次収益 CSV/粗利計算) を実装。Stripe SDK + Vercel Function + React UI は app bootstrap フェーズへ。

### テスト
- 19 tests pass、billing 行 99.21% / 分岐 97.77% (errors/pricing/revenue/webhook 100%、べき等性 WH03 100%)
- 全体 349/349 pass、typecheck clean

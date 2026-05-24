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

---

## 追記: Phase 3.5 Milestone B — Stripe SDK glue wiring (2026-05-24, `/flow:auto` 反復4)

defer 済の Stripe SDK / Vercel Function / React glue を wiring (core は injectable 設計のまま再利用)。Stripe SDK は `stripe@^17.7.0` を install し `api/billing/_lib/stripe.ts` に隔離 (handler は dynamic import、`maxNetworkRetries:1` で UT-BL-CS07 の retry 1 を SDK 委譲)。

### 追加実装 (Vercel Function / api/)
- `api/billing/_lib/stripe.ts` (新規): `createStripeCheckoutFn` (Checkout 作成) + `createStripeWebhookVerifier` (`constructEvent` 署名検証)。env 未設定は fail-closed throw。
- `api/billing/create-checkout-session.ts` (新規): `parseCheckoutBody` / `buildCheckoutParams` (ai_credits=¥100×qty / pdf_unlock=PWYW custom amount、純関数) / `runCreateCheckout` (requireLinked → 検証 → Stripe Session → url、DI) + handler (Clerk 検証 → resolveUserId → `fetchIsLinked` (非匿名判定) → 401 link_required / 400 invalid_amount / 500 checkout_failed)。
- `api/billing/stripe-webhook.ts` (新規): `processStripeWebhook` (署名検証→`applyBillingWebhook`、DI) — 署名不一致 401 (UT-BL-WH04) / 適用失敗 500 (UT-BL-WH07、Stripe retry) / 重複・ignore・成功 200。Drizzle `BillingStore` 実装 (webhook_dedupe / billing_unlocks / users.ai_credits_remaining 加算 / pdf_unlocked)。
- `api/billing/status.ts` (新規、GET): ai_credits_remaining / pdf_unlocked を返す (hooks 用)。
- `api/billing/confirm.ts` (新規、GET `?session_id`): 当該 user の billing_unlocks 反映確認 ([SEC-005] user_id スコープ、successConfirm poll 用)。
- `api/export-revenue.ts` (新規、cron 月初05:00): `previousYearMonth` + `runExportRevenue` (集計→CSV→R2 保存→Slack、DI)。0 件は header のみ CSV + 「収益なし」通知 (UT-BL-ER02)。`fetchRevenueRows` は billing_unlocks + api_usage_monthly を集計。
- `api/storage/_lib/r2.ts` (追記): `createR2Writer` (直接 PUT、CSV 保存用)。

### 追加実装 (frontend / src/features/billing/)
- `errors.ts` (追記): `CheckoutFailedError` (network/5xx、UT-BL-A03) / `CheckoutPendingError` (poll timeout、UT-BL-SC02)。
- `api.ts` (新規): `createCheckout` (UT-BL-A01/A02/A03、401→LinkRequiredError) / `fetchBillingStatus` / `confirmCheckout` (poll、SC01〜SC03、sleep 注入で決定的テスト)。
- `hooks.ts` (新規): `useBillingStatus` 基底 + `useAiCredits` (UT-BL-H01/H02) / `usePdfUnlocked` (UT-BL-H03)。**元 PLAN の Supabase Realtime は Vercel+Neon 構成に無いため mount fetch + 明示 refresh() で代替** (JSDoc 明記)。
- `OAuthRequiredModal.tsx` (新規): 匿名 user 向け Google 連携モーダル (UT-BL-OM01/OM02、`onLink` で linkGoogleIdentity を配線)。
- `index.ts` (追記): glue を再輸出。

### 設定
- `vercel.json`: export-revenue cron (`0 5 1 * *`) 追加。
- `.env.example`: `APP_BASE_URL` 追加 (Checkout redirect 組み立て用)。

### glue テスト結果
- 新規 43 tests pass (create-checkout 11 / stripe-webhook 5 / stripe _lib 5 / export-revenue 5 / api 9 / hooks 4 / OAuthRequiredModal 4)
- 全体 **540/540 pass** (was 497)、typecheck 0 / eslint 0、npm audit high 0 (stripe@17.7.0)
- src/features/billing 行 99.14%。残 = E2E green (Milestone C: 実 Stripe Checkout 完走 + webhook 反映 poll、Vercel preview)

### glue 差分メモ
- 元 PLAN は Supabase Edge Functions / Realtime 前提だったが、プロジェクトは Vercel Functions + Neon に標準化済 (先行 storage/ai/analytics glue と同様)。Edge Fn → `api/billing/*.ts`、Realtime 購読 → status fetch + refresh()/poll に置換。
- `runCreateCheckout` の isLinked は handler が Neon users.is_anonymous から判定 (pricing.requireLinked に注入)。

---

## 追記: Phase 3.5 Milestone C — PWYW 課金画面 presentation (2026-05-24, `/flow:auto` D20260524_051 反復6)

deferred 済の billing UI を実装 (Stripe api/hooks/pricing は実装済を compose、確立 pattern)。

### 追加ファイル (src/features/billing/)
- `pages/BillingPage.tsx` (新規): status (ai_credits/pdf_unlocked) + AI credits 数量 selector (1-10、`aiCreditsAmountJpy`/`aiCreditsGranted`) + PWYW タブ (PwywSelector) + 「購入する」。loading/error/pending/success (E-BL-001/002/007)。OAuth gate は **既存 `OAuthRequiredModal` 再利用** (`isLinked=false` で checkout 中断 → modal、E-BL-002)。
- `pages/BillingSuccessPage.tsx` (新規): `/billing/success?session_id` 復帰画面。`onConfirm` 注入 poll、処理中→受領確認→30s fallback (E-BL-005)。
- `components/PwywSelector.tsx` (新規): suggested chips [¥100/¥500/¥1000] + custom input、`validatePwywAmount`。`formatJpy` 輸出。
- `index.ts` (追記) / `App.tsx` (`/billing` + `/billing/success` route)。

### 設計判断 (seam)
- **Stripe Checkout redirect は `onCheckout` 注入 seam** — component は `createCheckout`/`window.location` を import しない。test は `onCheckout({type,quantity/amountJpy})` 呼出を assert (実 redirect なし)。app 層で `createCheckout` + `location.assign` を注入。
- `BillingSuccessPage.onConfirm` も注入 (実 `confirmCheckout` poll は app 層)。
- logic ファイル (api/hooks/pricing/revenue/webhook/errors/OAuthRequiredModal) は無改変。

### TDD で検出+修正した bug
- `BillingPage` の AI credits 購入ボタンが range 外数量 (例 11) で disable されず、`aiCreditsAmountJpy`/`validateQuantity` が render 中 throw し得た → `qtyValid` gate で button-disable + total 表示分岐を共通化して修正。

### テスト結果
- 新規 3 file / +34 tests (PwywSelector 11 / BillingPage 17 / BillingSuccessPage 6)。
- 全体 **738/738 pass** (was 704)、typecheck 0 / eslint 0。

### 残 (browser 実機検証 + app 層配線)
- 実 Stripe Checkout redirect (test card 4242) + success_url/cancel_url round-trip / confirm poll の webhook lag。
- 視覚レイアウト (PWYW chips モバイル)。
- `onCheckout`/`onConfirm`/`isLinked`/`status` の app 層配線。各 004 ジャーニー E2E (`docs/E2E_GATE_STATUS_20260524.md`)。

# 単体テストレポート: billing (UI 非依存コア)

## 実施日時
2026-05-23 18:16 (JST)

## 関連ドキュメント
- [003_billing_UNIT_TEST.md](./003_billing_UNIT_TEST.md)

## テスト実行環境
- Node 20 / Vitest 2.1.9 (`environment: node`)

## テスト結果

| # | テストケース | テストファイル | 結果 |
|---|------------|-------------|------|
| UT-BL-CS01〜CS03 | validateQuantity 1/10 OK / 11・0・小数 reject + 金額/付与 | pricing.test.ts | ✅ |
| UT-BL-CS04/CS05 | validatePwywAmount 100-10000 / 50・10001 reject | pricing.test.ts | ✅ |
| UT-BL-CS06 | requireLinked 匿名→LinkRequiredError | pricing.test.ts | ✅ |
| UT-BL-ER03/ER05 | grossMargin + buildRevenueCsv 列順 | pricing.test.ts | ✅ |
| UT-BL-WH01/WH02 | mapStripeEvent + applyBillingWebhook ai_credits/pdf_unlock | webhook.test.ts | ✅ |
| UT-BL-WH03 | べき等性 (処理済 event → applied=false) | webhook.test.ts | ✅ (100%) |
| UT-BL-WH05/WH06 | 不明 type / userId 欠落 → ignore | webhook.test.ts | ✅ |
| (追加) | quantity 欠落/非整数→1、amount/pi 欠落→0/null、ignore は recordEvent のみ | webhook.test.ts | ✅ |

## サマリー

| 項目 | 値 |
|------|-----|
| 合計テスト数 | 19 件 |
| 成功 | 19 件 / 失敗 0 件 / 成功率 100% |
| billing 行カバレッジ | 99.21% (目標 85% ↑) |
| billing 分岐カバレッジ | 97.77% (目標 80% ↑、webhook critical 100% / べき等性 100%) |
| errors/pricing/webhook/revenue.ts | 行 100% |

## カバレッジ未達・補足
- `index.ts` (barrel) 0%: re-export のみ。
- ~~defer~~ → **Phase 3.5 Milestone B で解消** (下記追記参照)。

---

## 追記: Phase 3.5 Milestone B glue テスト (2026-05-24, `/flow:auto` 反復4)

| # | テストケース | テストファイル | 結果 |
|---|------------|-------------|------|
| UT-BL-CS01/CS03/CS04/CS05 | buildCheckoutParams: ai_credits ¥100×qty / pdf_unlock custom amount / 範囲外 reject | api/billing/create-checkout-session.test.ts | ✅ |
| UT-BL-CS06 | runCreateCheckout 匿名→LinkRequiredError + Stripe 未呼出 | 同上 | ✅ |
| UT-BL-CS07 | Stripe API err 伝播 (handler 500、retry は SDK maxNetworkRetries:1) | 同上 | ✅ |
| (追加) | parseCheckoutBody 正規化 / url null → throw | 同上 | ✅ |
| UT-BL-WH01/WH03 | 正常 credits 付与 / 重複 event べき等 | api/billing/stripe-webhook.test.ts | ✅ |
| UT-BL-WH04 | 署名不一致 → 401 + store 未呼出 | 同上 | ✅ |
| UT-BL-WH07 | DB INSERT 失敗 → 500 (Stripe retry) | 同上 | ✅ |
| (追加) | 未対応 event type → 200 ignore (recordEvent のみ) | 同上 | ✅ |
| (fail-closed) | stripe.ts factory: secret 未設定 throw / 指定で fn 返却 | api/billing/_lib/stripe.test.ts | ✅ |
| UT-BL-A01/A02/A03 | createCheckout ai/pdf 送出 / network→CheckoutFailedError / 401→LinkRequiredError | src/features/billing/api.test.ts | ✅ |
| UT-BL-SC01/SC02/SC03 | confirmCheckout 即 resolve / timeout→CheckoutPendingError / 2回目反映 | 同上 | ✅ |
| (追加) | fetchBillingStatus 正常 / 5xx→CheckoutFailedError | 同上 | ✅ |
| UT-BL-H01/H02 | useAiCredits mount fetch / refresh re-render | src/features/billing/hooks.test.tsx | ✅ |
| UT-BL-H03 | usePdfUnlocked pdf_unlocked 反映 | 同上 | ✅ |
| UT-BL-OM01/OM02 | OAuthRequiredModal 表示 + 連携ボタン / onLink 呼出 | src/features/billing/OAuthRequiredModal.test.tsx | ✅ |
| UT-BL-ER01/ER02/ER06 | export-revenue 集計 CSV 保存 / 0件「収益なし」/ Slack 未設定で続行 | api/export-revenue.test.ts | ✅ |

### glue サマリー

| 項目 | 値 |
|------|-----|
| 追加テスト数 | 43 件 (合計 62 件) |
| 全体テスト | **540/540 pass** (was 497)、成功率 100% |
| typecheck / eslint | 0 / 0 |
| src/features/billing 行カバレッジ | 99.14% |
| npm audit (high/critical) | 0 (stripe@17.7.0) |

### 残 (Milestone C / E2E)
- 実 Stripe Checkout 完走 → webhook 反映 → confirm poll の E2E (Vercel preview、UT-BL 統合)。
- UT-BL-ER04 (api_usage_monthly コスト連動の粗利精緻化) は実データ蓄積後に E2E で検証。
- handler default export (DB dynamic import 部) は単体非対象、Milestone C E2E でカバー (先行 storage/ai/analytics と同方針)。

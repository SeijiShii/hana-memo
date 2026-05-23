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
- **defer (本レポート対象外)**: UT-BL-CS07 (Stripe API retry)、UT-BL-WH04/WH07 (署名検証/DB 失敗)、UT-BL-H/A/SC/OM (hook/checkoutApi/successConfirm/modal)、UT-BL-ER01/ER02/ER04/ER06 (実 Storage/Slack/api_usage 集計)。app bootstrap フェーズで Stripe SDK mock + jsdom + BillingStore 実装にて実施。

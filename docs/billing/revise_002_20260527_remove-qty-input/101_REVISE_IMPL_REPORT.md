# 実装レポート — billing revise_002 (数量入力撤去)

> **入力**: 001_REVISE_SPEC / 002_REVISE_PLAN / 003_REVISE_UNIT_TEST
> **実装日**: 2026-05-27
> **方式**: TDD (RED→GREEN)、直接実装 (小規模・Class A)

---

## 変更ファイル
| ファイル | 変更 |
|---|---|
| `src/features/billing/pages/BillingPage.tsx` | `qty` state / `qtyValid` / `<input aria-label="数量">` / 合計表示 / 数量エラー / `AI_QTY_MIN,AI_QTY_MAX,aiCreditsGranted` import を削除。固定価格表示「¥100 で AI識別が10回ふえます」+ 再購入の一言 + ボタン「¥100 で購入する」に。`handlePurchase` は `quantity:1` 固定送信。`canPurchase = !checkoutPending` |
| `src/features/billing/pages/BillingPage.test.tsx` | 数量入力/合計/数量エラー test を削除、固定価格表示 (数量入力非存在) + quantity:1 送信 test に更新。ボタン名 `¥100 で購入する` |
| `src/features/billing/BillingContainer.test.tsx` | ボタン名 `購入する` → `¥100 で購入する` (3 箇所) |
| `e2e/billing.spec.ts` | 廃止機能ガードに「数量入力 (`getByLabel('数量')`) / 合計 が count 0」(E2E-R2-01) を追加 |

## 検証
- typecheck: **0 errors**
- unit: **898 passed (121 files)** — BillingPage 10 / BillingContainer 4 含む全 green
- backend (pricing / create-checkout-session): 変更なし・回帰 green (quantity=1 検証不変)

## DoD 達成
- [x] 数量入力 (`aria-label="数量"`) が DOM に無い
- [x] 購入ボタン押下で `onCheckout({type:'ai_credits', quantity:1})`
- [x] 残回数・成功・Checkout 失敗エラーの既存挙動維持 (回帰なし)
- [x] typecheck 0 / billing unit green
- [ ] prod デプロイ後 /billing で数量入力が無いことを目視 (次回デプロイ時)

## i18n / voice
新文言は pricing SoT (`formatJpy(aiCreditsAmountJpy(1))` / `AI_CREDITS_PER_UNIT`) 由来でハードコード数値なし。O38 jargon なし、design-system voice (穏やかな敬体) 準拠。

## 残
- 次回 prod デプロイ (`scripts/deploy-prod.sh`) に同梱 → /billing 目視。
- E2E-R2-01 は CI / preview で実走 (no-key スモークに含まれる)。

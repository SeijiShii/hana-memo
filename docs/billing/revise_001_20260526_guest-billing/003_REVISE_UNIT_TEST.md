# billing 単体テスト計画 (ゲストトークン低価格単発課金 + pdf_unlock 全廃)

> **入力**: `./001_REVISE_SPEC.md`, `./002_REVISE_PLAN.md`, Step 2 で読んだ既存テスト
> **最終更新**: 2026-05-26

---

## 1. 追加テストケース

### 1.1 正常系
| ID | 対象 | 入力 | 期待出力 |
|---|---|---|---|
| UT-R-Q01 | `effectiveQuota` 匿名+クレジット | `{isAnonymous:true, trialUsedCount:3, aiCreditsRemaining:10}` | `{remaining:10, mustLink:(廃止), consume:'credits'}` |
| UT-R-Q02 | 匿名 trial 優先消費 | `{isAnonymous:true, trialUsedCount:1, aiCreditsRemaining:10}` | `remaining:12, consume:'trial'` |
| UT-R-Q03 | 匿名 trial+credits 共枯渇 | `{isAnonymous:true, trialUsedCount:3, aiCreditsRemaining:0}` | `remaining:0, consume:'none'` (mustLink 概念なし) |
| UT-R-CS01 | pricing 付与数 | `creditsFor(1)` | `10` |
| UT-R-CS02 | pricing 金額 | `amountFor(1)` | `100` |
| UT-R-CO01 | checkout 匿名発行 | `runCreateCheckout(userId, /*isLinked*/false, {type:'ai_credits',quantity:1})` | `requireLinked` を**呼ばず** `{url,sessionId}` を返す |
| UT-R-WH01 | webhook 付与 | `checkout.session.completed (ai_credits, qty1)` | `grantCredits(userId,10)` |

### 1.2 異常系
| ID | 対象 | 失敗条件 | 期待振る舞い |
|---|---|---|---|
| UT-R-CS03 | quantity 範囲 | `validateQuantity(2)` | `InvalidAmountError` (上限¥100=qty1) |
| UT-R-ID01 | identify 枯渇 | 匿名 trial+credits=0 | `QuotaExceededError` (→402)。`LinkRequiredError` を投げない |

### 1.3 境界値
| ID | 対象 | 境界 | 期待 |
|---|---|---|---|
| UT-R-Q04 | trial=max-1 + credits=0 | trialUsedCount=2 | remaining:1, consume:'trial' |
| UT-R-Q05 | trial=0残 + credits=1 | trialUsedCount=3, credits=1 | remaining:1, consume:'credits' |

## 2. 修正テストケース

| ID | 対象 | 修正前 | 修正後 | 理由 |
|---|---|---|---|---|
| UT-AI-Qxx | quota 匿名 | `mustLink:true` 期待 | mustLink 参照削除、credits 加味 | mustLink 廃止 |
| (identify) | `api/identify-plant.test.ts` | 匿名超過で 401 `link_required` | 402 `quota_exceeded` | 401→402 化 |
| (checkout) | `create-checkout-session.test.ts` | 匿名で 401 `link_required` 期待 | 匿名で 200 (url 返却) 期待 | requireLinked 撤廃 |
| (status) | `status` テスト | `pdfUnlocked`/`mustLink` フィールド検証 | `aiCreditsRemaining` のみ検証 | レスポンス縮小 |
| (webhook) | `webhook.test.ts` | `ai_credits`=20×qty | =10×qty | pricing 変更 |
| (spam-check) | `spam-check.test.ts` | cap→`mustLink:true` | cap は guest-provision 側で拒否 (論点-R001) | 濫用制御移譲 |

## 3. 削除テストケース

| ID | 対象 | 削除理由 |
|---|---|---|
| pdf_unlock checkout / webhook テスト | `create-checkout-session.test.ts` / `stripe-webhook.test.ts` の `pdf_unlock` ケース | pdf_unlock 廃止 |
| PWYW 検証テスト | `pricing.test.ts` の `validatePwyw` / 100-10000 | PWYW 廃止 |
| `requirePdfUnlocked` テスト | `export.test.ts:73-78` | export 機能削除 |
| `OAuthRequiredModal` テスト | billing | モーダル削除 |
| export hooks / dialog テスト | `src/features/export/*.test.*` | export 削除 |

## 4. リグレッション強化

- Webhook 冪等性 (`webhook_dedupe` event.id + `billing_unlocks` session_id UNIQUE) が pdf_unlock 削除後も維持されること。
- `ai_credits_remaining` 負数禁止 CHECK が消費経路で守られること。
- 匿名・リンク済の双方で credits が正しく消費されること (回帰: リンク済の monthly→credits 順)。

## 5. Mock 方針差分

| 対象 | 前回 | 今回 | 理由 |
|---|---|---|---|
| checkout deps | `isLinked` を引数注入 | `isLinked` 引数を除去 or 無視 | requireLinked 撤廃 |
| その他 | DI 注入 (Injectable, O35) | 変更なし | — |

## 6. カバレッジ目標

| 種別 | 目標 | 根拠 |
|---|---|---|
| 行 | 80% | 既存継承 (vitest.config) |
| 分岐 | 70% | 既存継承。quota 匿名分岐の追加ケースを網羅 |

## 7. 更新履歴
| 日付 | 変更概要 | 実行者 |
|---|---|---|
| 2026-05-26 | 初版作成 | /flow:revise |

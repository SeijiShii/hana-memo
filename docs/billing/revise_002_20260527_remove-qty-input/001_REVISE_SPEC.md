# billing 変更仕様書 (クレジット購入画面の数量入力撤去)

> **改修種別**: リファクタ (UI 簡素化、機能変更なし)
> **issue / slug**: 002 / remove-qty-input
> **基準 SPEC**: `../001_billing_SPEC.md` + `../revise_001_20260526_guest-billing/001_REVISE_SPEC.md`
> **最終更新**: 2026-05-27
> **タグ**: (UI、auth-required は購入時のみ・本改修と無関係)

---

## 1. 変更概要

revise_001 で AI クレジット購入は **¥100 = AI識別10回・quantity=1 固定 (単発)** になった (`AI_QTY_MIN=AI_QTY_MAX=1`)。しかし `BillingPage` には数量 `<input min=1 max=1>` + 合計計算 + 「数量は1〜1で入力」エラーが残存し、**選択肢ゼロの個数入力**としてユーザーを混乱させている。本改修は数量入力 UI を撤去し、**固定価格表示 +「¥100 で購入する」単一ボタン**に簡素化する。送信値・backend・課金額は不変。

## 2. 変更前 vs 変更後

### 2.1 UC 変更
| UC ID | 変更前 | 変更後 | 理由 |
|---|---|---|---|
| UC1 AI クレジット購入 | 数量入力 (1〜1) → 合計表示 → 購入 | 固定「¥100 で AI識別が10回ふえます」+「¥100 で購入する」1 ボタン | 選択肢ゼロの入力は不要・混乱の元 |

### 2.2 入出力変更
| 対象 | 変更前 | 変更後 | 互換性 |
|---|---|---|---|
| 購入リクエスト body | `{type:'ai_credits', quantity: qty}` (qty は state、常に 1) | `{type:'ai_credits', quantity: 1}` (固定) | ✅ 完全互換 (送る値は同一) |
| BillingPage props | `onCheckout(input)` | 変更なし | ✅ |

### 2.3 データモデル変更
| エンティティ | 変更内容 | マイグレーション要否 |
|---|---|---|
| (なし) | UI のみ、DB スキーマ・課金額・付与数すべて不変 | ❌ 不要 |

### 2.4 バリデーション・エラー変更
| 対象 | 変更前 | 変更後 |
|---|---|---|
| 数量バリデーション (UI) | `qtyValid` state + 「数量は1〜1の整数で入力」エラー表示 | **撤去** (入力が無いので UI 検証不要) |
| backend `validateQuantity` | quantity=1 のみ許可 | **変更なし** (防御的に残す。固定送信 1 は常に通る) |

## 3. 影響範囲
| 対象 | 影響度 | 説明 |
|---|---|---|
| `src/features/billing/pages/BillingPage.tsx` | 高 | 直接対象 (数量 UI 撤去) |
| `src/features/billing/pages/BillingPage.test.tsx` | 中 | 数量入力前提の assertion を更新 |
| `src/features/billing/pricing.ts` | なし | 定数・関数は不変 (防御的に保持) |
| backend `api/billing/_handlers/create-checkout-session.ts` | なし | quantity=1 を受け続ける |

## 4. 後方互換性
- **互換維持**: ✅。購入リクエストの送信値 (`quantity:1`) は変更前と同一。backend・課金額・付与数すべて不変。ユーザー/データへの非互換なし。

## 5. ロールバック方針
- **コード revert で戻せる**: ✅ (UI のみの単一ファイル変更 + test)。DB 変更なしのため rollback 手順不要。

## 6. リリース戦略
- **方式**: 一括 (UI 簡素化、リスク極小)。フィーチャーフラグ不要。次回 prod デプロイ (`scripts/deploy-prod.sh`) に同梱。

## 7. 詳細仕様 (新仕様)

### 7.1 詳細 UC (新仕様)
**UC1 (改) AI クレジット購入 — 固定価格・単一ボタン**
- ステータス表示 (残回数) は現状維持。
- 購入セクション = 固定文言「¥100 で AI識別が10回ふえます」+ ボタン「¥100 で購入する」。
- ボタン押下 → `onCheckout({ type:'ai_credits', quantity: 1 })` → Stripe Checkout へ。
- 処理中はボタン disabled + 「処理中…」。
- 数量入力・合計計算・数量エラーは存在しない。
- 再購入導線 (QuotaModal → /billing) は revise_001 のまま維持 (使い切り後にまた ¥100)。

### 7.2 入出力 (新仕様)
- 入力: ボタン押下のみ。常に `quantity: 1`。
- 出力: Checkout URL へ redirect (現状の seam 経由、変更なし)。

### 7.3 データモデル (新仕様)
変更なし。

### 7.4 バリデーション・エラー (新仕様)
- UI: 数量検証なし (入力が無い)。Checkout 失敗時の「決済システムが応答しません」エラーは維持。
- backend: `validateQuantity(1)` を通過 (不変)。

### 7.5 機能固有 NFR + 既存連携 (新仕様)
変更なし (Stripe Checkout seam / status fetch は現状維持)。

## 9. 未決事項
現時点で論点なし (2026-05-27)。pricing 定数 `AI_QTY_MIN/MAX` は防御的に残す方針 (将来複数セット販売の再導入時に UI だけ戻せる)。

## 10. 更新履歴
| 日付 | 変更概要 | 実行者 |
|---|---|---|
| 2026-05-27 | 初版作成 | /flow:revise |

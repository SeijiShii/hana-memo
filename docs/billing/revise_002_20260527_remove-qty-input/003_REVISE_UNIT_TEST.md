# billing 単体テスト計画 (数量入力撤去)

> **入力**: `./001_REVISE_SPEC.md`, `./002_REVISE_PLAN.md`, `src/features/billing/pages/BillingPage.test.tsx`
> **最終更新**: 2026-05-27

---

## 1. 追加テストケース
### 1.1 正常系
| ID | 対象 | 入力 | 期待出力 |
|---|---|---|---|
| UT-R2-01 | BillingPage 購入ボタン | 「¥100 で購入する」押下 | `onCheckout` が `{type:'ai_credits', quantity:1}` で 1 回呼ばれる |
| UT-R2-02 | 固定価格表示 | render | 「¥100」+「10 回」(= `AI_CREDITS_PER_UNIT`) を含む文言が表示される |

### 1.2 異常系
| ID | 対象 | 失敗条件 | 期待振る舞い |
|---|---|---|---|
| UT-R2-03 | Checkout 失敗 | `onCheckout` reject | 「決済システムが応答しません…」エラー表示 (既存挙動維持) |

## 2. 修正テストケース
| ID | 対象 | 修正前 | 修正後 | 理由 |
|---|---|---|---|---|
| UT-R2-M1 | 購入導線 test | 数量 input に値を入れて購入 → quantity=N | 数量入力なしで購入 → quantity=1 固定 | 数量 UI 撤去 |

## 3. 削除テストケース
| ID | 対象 | 削除理由 |
|---|---|---|
| UT-R2-D1 | `aria-label="数量"` input の存在・値変更 test | 数量入力を撤去 |
| UT-R2-D2 | 合計表示 (`合計 ¥X（N 回追加）`) の数量連動 test | 数量可変でなくなった (固定表示に) |
| UT-R2-D3 | 「数量は1〜1で入力」エラー test | UI 数量検証を撤去 |

## 4. リグレッション強化
- 残回数表示 (`AI 識別: 残 N 回` / `ステータス未取得`)、成功表示 (`購入が完了しました`)、Checkout 失敗エラーの既存 test は**維持**。
- backend `pricing.test` / `create-checkout-session.test` は**変更なし** (quantity=1 検証は不変、回帰確認のみ)。

## 5. Mock 方針差分
| 対象 | 前回 | 今回 | 理由 |
|---|---|---|---|
| `onCheckout` | vi.fn 注入 | 変更なし | seam 不変 |

## 6. カバレッジ目標
| 種別 | 目標 | 根拠 |
|---|---|---|
| 行 | 80% | 既存継承 (BillingPage は分岐減で容易) |
| 分岐 | 70% | 既存継承 |

## 7. 更新履歴
| 日付 | 変更概要 | 実行者 |
|---|---|---|
| 2026-05-27 | 初版作成 | /flow:revise |

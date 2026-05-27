# AI_LOG — /flow:revise billing #003 (2026-05-27)

- **コマンド**: /flow:revise (billing, issue 002 remove-qty-input)
- **対象機能 + issue**: billing / 002 remove-qty-input
- **状態**: 完了 (設計)
- **依存セッション**: revise_001 (D20260526_065/069 — AI_QTY_MAX=1 単発化、本改修の前提)

## 主要決定サマリ
| id | 決定 |
|---|---|
| D20260527-010 | 改修要望 = クレジット購入画面の数量入力撤去 (AI_QTY_MAX=1 で選択肢ゼロ・混乱の元) |
| D20260527-011 | Read スコープ = BillingPage.tsx(.test) + pricing.ts + 既存/revise_001 SPEC (確認済) |
| D20260527-012 | 購入 UI 設計 = 固定価格「¥100 で AI識別が10回ふえます」+ 単一「¥100 で購入する」ボタン (ユーザー選択、案A) |
| D20260527-013 | backend/pricing は不変 (validateQuantity・定数を防御的に残す)、quantity=1 固定送信。後方互換 ✅、migration 不要 |

## Decisions
```yaml
- id: D20260527-012
  timestamp: 2026-05-27T14:30:00+09:00
  command: /flow:revise
  phase: Step 3.1 購入 UI 設計
  question: 数量入力撤去後の購入 UI の見せ方
  options: [固定価格+単一ボタン, ボタンのみ(価格はボタン内)]
  recommended: 固定価格+単一ボタン
  chosen: 固定価格+単一ボタン (「¥100 で AI識別が10回ふえます」+「¥100 で購入する」)
  chosen_type: explicit-choice
  depends_on: [revise_001 AI_QTY_MAX=1 decision]
  context: AI_QTY_MIN=AI_QTY_MAX=1 のため数量入力は選択肢ゼロ。固定表示が最もシンプルで迷わない。
```

## 生成ファイル
- revise_002_20260527_remove-qty-input/{README,001_REVISE_SPEC,002_REVISE_PLAN,003_REVISE_UNIT_TEST,004_REVISE_E2E_TEST,INDEX}.md
- (005 MIGRATION 不要 — UI のみ)

## 次アクション
- 実装: BillingPage.test 更新 (RED) → 数量 UI 撤去 (GREEN) → typecheck/unit green。小規模のため直接 TDD 実装可。
- 次回 prod デプロイ (scripts/deploy-prod.sh) に同梱。

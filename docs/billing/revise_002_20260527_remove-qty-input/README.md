# 改修: クレジット購入画面の数量入力 UI を撤去

- **issue / slug**: 002 / remove-qty-input
- **実施日**: 2026-05-27
- **対象機能**: ../README.md
- **基準 SPEC**: ../001_billing_SPEC.md + revise_001 (単発化済)
- **改修要望**: クレジット購入画面に数量入力があるが、AI_QTY_MAX=1 (revise_001 で単発化) のため選択肢が無く不要。数量入力を撤去し「¥100 で AI識別10回」の固定価格 + 単一購入ボタンにする。
- **状態**: 設計中

## このフォルダに置くドキュメント
- `001_REVISE_SPEC.md` — 変更仕様 (数量入力 → 固定価格単一ボタン)
- `002_REVISE_PLAN.md` — 変更計画 (BillingPage.tsx + test)
- `003_REVISE_UNIT_TEST.md` — 単体テスト計画
- `004_REVISE_E2E_TEST.md` — E2E (回帰: 数量入力非表示 + quantity=1 送信)
- (005 MIGRATION 不要 — UI のみ、DB 変更なし)

## 関連
- 親: ../README.md / ../001_billing_SPEC.md
- 前提改修: ../revise_001_20260526_guest-billing/ (AI_QTY_MAX=1 単発化、本改修の前提)

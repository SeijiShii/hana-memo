# account

アカウント管理。**起動時は認証不要 (匿名 Auth 自動発行)** で撮影・保存可能。「他端末で見たい / 課金したい」時の Google OAuth リンク UI、設定画面、オプトアウト管理を担当。

関連論点: [論点-006] 匿名 SPAM 抑止, [論点-007] 匿名→リンク移行戦略。

## このフォルダに置くドキュメント

- `001_account_SPEC.md` — 仕様書（`/flow:feature` で生成）
- `002_account_PLAN.md` — 実装計画書
- `003_account_UNIT_TEST.md` — 単体テスト計画
- `004_account_E2E_TEST.md` — E2E テスト計画
- `101_account_IMPL_REPORT.md` — 実装レポート（`/dev-tdd` で生成）
- `estimate_YYYYMMDD.md` — 機能単位見積もり（`/flow:estimate` で生成）

## 関連

- 概念設計: `../concept.md` §1.3.1
- 依存: `_shared/auth`
- 全体見積: `../estimates/`
- 実装コード対応: `src/features/account/` （§1.4 参照）

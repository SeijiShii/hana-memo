# legal

プライバシーポリシー / 利用規約 / 特定商取引法表記 / Cookie ポリシー / AI 利用同意 UI。`/legal/*` 配下の静的ページを担当。

## このフォルダに置くドキュメント

- `001_legal_SPEC.md` — 仕様書（書類本文 + UI 設計）
- `002_legal_PLAN.md` — 実装計画書
- `003_legal_UNIT_TEST.md` — 単体テスト計画 (同意フローのテスト)
- `004_legal_E2E_TEST.md` — E2E テスト計画
- `101_legal_IMPL_REPORT.md` — 実装レポート
- `privacy_policy.md` — プライバシーポリシー原稿
- `terms_of_service.md` — 利用規約原稿
- `specified_commercial_transactions.md` — 特商法表記原稿

## 関連

- 概念設計: `../concept.md` §9 法務・コンプライアンス書類
- 依存: なし (静的ページ + 同意 UI のみ、`_shared/db` の `consent_logs` は同意記録)
- 実装コード対応: `src/features/legal/`

# billing

PWYW + content-unlock 課金 (AI 同定追加枠 100 円 / 図鑑 PDF 500 円 PWYW)。Stripe Checkout を使用。

## このフォルダに置くドキュメント

- `001_billing_SPEC.md` — 仕様書
- `002_billing_PLAN.md` — 実装計画書
- `003_billing_UNIT_TEST.md` — 単体テスト計画
- `004_billing_E2E_TEST.md` — E2E テスト計画
- `101_billing_IMPL_REPORT.md` — 実装レポート
- `estimate_YYYYMMDD.md` — 機能単位見積もり

## 関連

- 概念設計: `../concept.md` §1.3.1, §4.6.4 収益指標, §4.6.4.1 エクスポート機構
- 依存: `account`, `_shared/ai` (使用量参照)
- 実装コード対応: `src/features/billing/`

# capture

撮影 → AI 同定 → 保存の中核フロー (UC1)。OpenAI gpt-4o-mini Vision を呼び出し、位置 + 季節 + 履歴を prompt 注入して同定する。

## このフォルダに置くドキュメント

- `001_capture_SPEC.md` — 仕様書
- `002_capture_PLAN.md` — 実装計画書
- `003_capture_UNIT_TEST.md` — 単体テスト計画
- `004_capture_E2E_TEST.md` — E2E テスト計画
- `101_capture_IMPL_REPORT.md` — 実装レポート
- `estimate_YYYYMMDD.md` — 機能単位見積もり

## 関連

- 概念設計: `../concept.md` §1.3.1, §1.1 UC1, §5.2 データフロー
- 依存: `_shared/storage`, `_shared/ai`, `_shared/db`, `account`
- 関連論点: [論点-004] 位置情報の保存粒度
- 実装コード対応: `src/features/capture/`

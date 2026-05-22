# _shared/analytics（横断設計）

計測基盤 (Sentry + 自前コストログ)。エラー報告 / OpenAI API call ログ / コスト集計 / .env 単価管理。

## このフォルダに置くドキュメント

- `001_analytics_SPEC.md` — Sentry 連携 + コスト集計ロジック
- `002_analytics_PLAN.md` — 実装計画
- `003_analytics_UNIT_TEST.md` — 単体テスト計画
- `estimate_YYYYMMDD.md` — 横断単位見積もり

## 関連

- 概念設計: `../../concept.md` §1.3.2, §4.6.2 コスト集計メカニズム, §4.6.3 コスト指標
- 依存: (なし、Sentry SDK と自前ロギングのみ)
- 被依存: `_shared/ai` (OpenAI 呼び出しを計測), 全機能 (エラー報告)
- 関連論点: [論点-005] 利用分析ツール導入
- 実装コード対応: `src/shared/analytics/`

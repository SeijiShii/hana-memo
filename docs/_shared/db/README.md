# _shared/db（横断設計）

DB スキーマ・マイグレーション・RLS ポリシー。Supabase Postgres を使用。テーブル: users / plants / discoveries / images / api_usage / billing_unlocks / user_settings / consent_logs。

## このフォルダに置くドキュメント

- `001_db_SPEC.md` — テーブル定義 + RLS ポリシー設計
- `002_db_PLAN.md` — マイグレーション戦略
- `003_db_UNIT_TEST.md` — RLS テスト + マイグレーションテスト
- `estimate_YYYYMMDD.md` — 横断単位見積もり

## 関連

- 概念設計: `../../concept.md` §1.3.2, §5 データ設計
- 依存: (なし、基盤の基盤)
- 被依存: 全機能フォルダ
- 実装コード対応: `supabase/migrations/`, `src/shared/db/`

# _shared/storage（横断設計）

ストレージ。Supabase Storage ラッパ / 画像アップロード / private bucket / 署名 URL。

## このフォルダに置くドキュメント

- `001_storage_SPEC.md` — bucket 構成 + 署名 URL 戦略
- `002_storage_PLAN.md` — 実装計画
- `003_storage_UNIT_TEST.md` — 単体テスト計画
- `estimate_YYYYMMDD.md` — 横断単位見積もり

## 関連

- 概念設計: `../../concept.md` §1.3.2, §5.2 データフロー
- 依存: `_shared/db`
- 被依存: capture, notebook, export
- 実装コード対応: `src/shared/storage/`

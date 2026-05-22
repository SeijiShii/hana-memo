# _shared/types（横断設計）

TypeScript 共通型 (DTO / Supabase 自動生成型 / API 入出力型)。

## このフォルダに置くドキュメント

- `001_types_SPEC.md` — 共通型の責務範囲
- `002_types_PLAN.md` — Supabase 型生成のフロー
- `estimate_YYYYMMDD.md` — 横断単位見積もり

## 関連

- 概念設計: `../../concept.md` §1.3.2
- 依存: (なし)
- 被依存: 全機能フォルダ + `_shared/ai`
- 実装コード対応: `src/shared/types/`（`supabase.ts` は CLI 自動生成）

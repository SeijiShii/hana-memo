# _shared/db ドキュメントインデックス

**最終更新**: 2026-05-22 10:22
**生成元**: /flow:feature (連続設計モード)

<!-- auto-generated-start -->

## 機能概要
DB スキーマ・マイグレーション・RLS ポリシー (Supabase Postgres)。

## ファイル一覧（番号順）
| 番号 | ファイル | 種別 | 状態 | 最終更新 | 短い説明 |
|---|---|---|---|---|---|
| 001 | [001_db_SPEC.md](./001_db_SPEC.md) | SPEC | 完了 | 2026-05-22 | 8 テーブル + RLS + マテビュー + enum |
| 002 | [002_db_PLAN.md](./002_db_PLAN.md) | PLAN | 完了 | 2026-05-22 | 14 マイグレーション + TS ラッパ + Phase 3 分割 |
| 003 | [003_db_UNIT_TEST.md](./003_db_UNIT_TEST.md) | UNIT_TEST | 完了 | 2026-05-22 | RLS 検証中心、E2E は依存機能側でカバー |
| 004 | — | E2E_TEST | スキップ (cross-cutting) | — | 統合テストは capture/notebook/billing 等で実施 |

## サブフォルダ
| パス | 種別 | issue/slug | 状態 | 概要 | INDEX |
|---|---|---|---|---|---|
| (なし) |

## 関連
- 親 concept: `../../concept.md` §1.3.2 _shared/db 行, §5
- **依存**: (なし、基盤の基盤)
- **被依存**: 全機能フォルダ
- 実装コード: `supabase/migrations/`, `src/shared/db/`

## AI アクセスガイド
- 機能概要 → README.md
- データ設計 → ../../concept.md §5

## 機能性質タグ
- target_type: cross-cutting
- 基盤 (✅)
- auth-required (RLS で auth.uid() 参照)
- stateful (discovery_status enum で状態遷移)
- analytics (api_usage が §4.6.2 コスト集計の源泉)

<!-- auto-generated-end -->

<!-- user-edit-start -->
<!-- user-edit-end -->

# _shared/db ドキュメントインデックス

**最終更新**: 2026-05-23 11:00
**生成元**: /flow:feature (連続設計) + /flow:tdd (2026-05-23、Phase 0-4 完遂)
**状態**: **実装完了 (2026-05-23)** ← Phase 0 PJ bootstrap 同梱、28/28 vitest pass

<!-- auto-generated-start -->

## 機能概要
Neon Postgres スキーマ + Drizzle ORM + 認可ヘルパ (`withUserScope` / `assertOwner`) + SQL migrations + seed。BaaS Pivot で Supabase RLS は Drizzle 層 + Postgres trigger に置換。

## ファイル一覧（番号順）
| 番号 | ファイル | 種別 | 状態 | 最終更新 | 短い説明 |
|---|---|---|---|---|---|
| 001 | [001_db_SPEC.md](./001_db_SPEC.md) | SPEC | 完了 | 2026-05-22 | 10 テーブル (webhook_dedupe 含む) + Drizzle 層認可 + matview + enum |
| 002 | [002_db_PLAN.md](./002_db_PLAN.md) | PLAN | 完了 | 2026-05-22 | Phase 4 分割 (schema / access / matview+triggers / seed) |
| 003 | [003_db_UNIT_TEST.md](./003_db_UNIT_TEST.md) | UNIT_TEST | 完了 | 2026-05-22 | 認可ネガティブ中心、E2E は依存機能側でカバー |
| 004 | — | E2E_TEST | スキップ (cross-cutting) | — | 統合テストは capture/notebook/billing 等で実施 |
| **101** | **[101_db_IMPL_REPORT.md](./101_db_IMPL_REPORT.md)** | **IMPL_REPORT** | **完了** | **2026-05-23** | **Phase 0 PJ bootstrap + Phase 1-4 全実装、SEC-002/005/006 同時消化** |
| **102** | **[102_db_UNIT_TEST_REPORT.md](./102_db_UNIT_TEST_REPORT.md)** | **UNIT_TEST_REPORT** | **完了** | **2026-05-23** | **vitest 28/28 pass (access 12 + errors 9 + schema 7)** |

## サブフォルダ
| パス | 種別 | issue/slug | 状態 | 概要 | INDEX |
|---|---|---|---|---|---|
| [revise_sec_007_drizzle_orm_sqli_20260524](./revise_sec_007_drizzle_orm_sqli_20260524/) | revise (security-fix) | sec_007_drizzle_orm_sqli | **実装完了 (2026-05-24)** | drizzle-orm `0.36.4→0.45.2` SQL injection CVE (GHSA-gpj5-g38j-94v9) 解消、373/373 green、audit high 0 | [INDEX](./revise_sec_007_drizzle_orm_sqli_20260524/INDEX.md) |

## 関連
- 親 concept: `../../concept.md` §1.3.2 _shared/db 行, §5
- **依存**: (なし、基盤の基盤)
- **被依存**: 全機能フォルダ
- 実装コード: `src/shared/db/` + `drizzle/migrations/`

## AI アクセスガイド
- 機能概要 → README.md
- データ設計 → ../../concept.md §5

## 機能性質タグ
- target_type: cross-cutting
- 基盤 (✅)
- auth-required (Drizzle 層で `withUserScope` 強制)
- stateful (discovery_status enum で状態遷移)
- analytics (api_usage が §4.6.2 コスト集計の源泉)
- **security** (SEC-005 認可ネガティブテスト / SEC-006 webhook_dedupe / SEC-002 .env.example 反映済)

<!-- auto-generated-end -->

<!-- user-edit-start -->
<!-- user-edit-end -->

# _shared/analytics ドキュメントインデックス

**最終更新**: 2026-05-24 14:04
**生成元**: /flow:concept (初期化) + /flow:revise (2026-05-23) + /flow:tdd (2026-05-23) + Phase 3.5 glue (2026-05-24)
**状態**: 実装完了 (2026-05-24、cron handler + 実 Sentry beforeSend wiring 済。[SEC-004] は legal TDD Phase 4 で closed 予定)

<!-- auto-generated-start -->

## 機能概要
Sentry + 自前 OpenAI コストログ + PII scrubber ([SEC-004])。

## ファイル一覧（番号順）
| 番号 | ファイル | 種別 | 状態 | 最終更新 | 短い説明 |
|---|---|---|---|---|---|
| 001 | [001_analytics_SPEC.md](./001_analytics_SPEC.md) | SPEC | 完了 | 2026-05-22 | Sentry + cost.ts + check-quota Edge Function |
| 002 | [002_analytics_PLAN.md](./002_analytics_PLAN.md) | PLAN | 完了 | 2026-05-22 | Phase 3 分割 (cost → sentry → check-quota) |
| 003 | [003_analytics_UNIT_TEST.md](./003_analytics_UNIT_TEST.md) | UNIT_TEST | 完了 | 2026-05-22 | fail-soft 検証 + Slack 閾値ロジック |
| 004 | — | E2E_TEST | スキップ (cross-cutting) | — | — |
| 101 | [101_analytics_IMPL_REPORT.md](./101_analytics_IMPL_REPORT.md) | IMPL_REPORT | 完了 | 2026-05-23 | scrubber/sentry/cost/unit-prices/slack 実装 (api/ layer defer) |
| 102 | [102_analytics_UNIT_TEST_REPORT.md](./102_analytics_UNIT_TEST_REPORT.md) | UNIT_TEST_REPORT | 完了 | 2026-05-23 | 50 tests / 行 99.49% / 分岐 86.25% |

## サブフォルダ
| パス | 種別 | issue/slug | 状態 | 概要 | INDEX |
|---|---|---|---|---|---|
| `revise_sec_004_sentry_pii_scrub_20260523/` | revise | sec_004_sentry_pii_scrub | 実装完了 (TDD fold-in) | [SEC-004] Sentry beforeSend PII スクラブ + 7 パターン scrubber (法令必須) | [INDEX](./revise_sec_004_sentry_pii_scrub_20260523/INDEX.md) |

## 関連
- 親 concept: `../../concept.md` §1.3.2, §4.6.2, §4.6.3
- **依存**: `_shared/db` (api_usage / userSettings) ✅、`_shared/types/analytics` ✅、`_shared/helpers/id` (sha256Hex) ✅
- **被依存**: `_shared/ai`, 全機能
- 関連論点: [論点-005], [論点-014] ([SEC-004] scrub core 実装完了)
- 実装コード: `src/shared/analytics/{scrubber,sentry,cost,unit-prices,slack,sentry-client,index}.ts`
- 実装コード (glue、2026-05-24): `src/shared/analytics/sentry-client.ts` (実 Sentry binding) + `api/{refresh-matview,check-quota}.ts` + `api/_lib/cron.ts`
- defer 継続: `api/export-revenue.ts` (非 cron / 非 SEC、billing/export wiring フェーズ)

## AI アクセスガイド
- 機能概要 → README.md
- コスト集計メカニズム → ../../concept.md §4.6.2

## 機能性質タグ
- target_type: cross-cutting
- 基盤 (✅)
- analytics (api_usage + Sentry)
- auth-required (Sentry は opt-in user のみ)

<!-- auto-generated-end -->

<!-- user-edit-start -->
<!-- user-edit-end -->

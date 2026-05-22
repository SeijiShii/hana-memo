# _shared/analytics ドキュメントインデックス

**最終更新**: 2026-05-22 10:02
**生成元**: /flow:concept (初期化)

<!-- auto-generated-start -->

## 機能概要
Sentry + 自前 OpenAI コストログ。

## ファイル一覧（番号順）
| 番号 | ファイル | 種別 | 状態 | 最終更新 | 短い説明 |
|---|---|---|---|---|---|
| 001 | [001_analytics_SPEC.md](./001_analytics_SPEC.md) | SPEC | 完了 | 2026-05-22 | Sentry + cost.ts + check-quota Edge Function |
| 002 | [002_analytics_PLAN.md](./002_analytics_PLAN.md) | PLAN | 完了 | 2026-05-22 | Phase 3 分割 (cost → sentry → check-quota) |
| 003 | [003_analytics_UNIT_TEST.md](./003_analytics_UNIT_TEST.md) | UNIT_TEST | 完了 | 2026-05-22 | fail-soft 検証 + Slack 閾値ロジック |
| 004 | — | E2E_TEST | スキップ (cross-cutting) | — | — |

## サブフォルダ
| パス | 種別 | issue/slug | 状態 | 概要 | INDEX |
|---|---|---|---|---|---|
| (なし) |

## 関連
- 親 concept: `../../concept.md` §1.3.2, §4.6.2, §4.6.3
- **依存**: (なし)
- **被依存**: `_shared/ai`, 全機能
- 関連論点: [論点-005]
- 実装コード: `src/shared/analytics/`

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

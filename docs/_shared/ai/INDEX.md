# _shared/ai ドキュメントインデックス

**最終更新**: 2026-05-23 09:55
**生成元**: /flow:feature _shared/ai (+ /flow:revise 2026-05-23)

<!-- auto-generated-start -->

## 機能概要
OpenAI gpt-4o-mini Vision クライアント (Edge Function 経由、プロンプト構築 + 構造化出力 + retry + cost log)。

## ファイル一覧（番号順）
| 番号 | ファイル | 種別 | 状態 | 最終更新 | 短い説明 |
|---|---|---|---|---|---|
| 001 | [001_ai_SPEC.md](./001_ai_SPEC.md) | SPEC | 完了 | 2026-05-22 | identify-plant Edge Function + structured output schema |
| 002 | [002_ai_PLAN.md](./002_ai_PLAN.md) | PLAN | 完了 | 2026-05-22 | Phase 4 分割 (skeleton→openai→quota→front) |
| 003 | [003_ai_UNIT_TEST.md](./003_ai_UNIT_TEST.md) | UNIT_TEST | 完了 | 2026-05-22 | OpenAI mock + retry + parseStructuredOutput |
| 004 | — | E2E_TEST | スキップ (cross-cutting + 本番 API コスト) | — | capture E2E で 1 件 smoke test |

## サブフォルダ
| パス | 種別 | issue/slug | 状態 | 概要 | INDEX |
|---|---|---|---|---|---|
| `revise_sec_001-003_rate_limit_ssrf_20260523/` | revise | sec_001-003_rate_limit_ssrf | 設計完了 | [SEC-001] Upstash Ratelimit + [SEC-003] SSRF guard 反映 | [INDEX](./revise_sec_001-003_rate_limit_ssrf_20260523/INDEX.md) |

## 関連
- 親 concept: `../../concept.md` §1.3.2, §3, §6
- **依存**: `_shared/types/ai`, `_shared/auth` (JWT), `_shared/db` (discoveries), `_shared/analytics` (cost log), `_shared/storage` (signed URL)
- **被依存**: `capture` (識別呼出), `(将来) memory` (レコメンド精度向上)
- 実装コード: `src/shared/ai/`, `supabase/functions/identify-plant/`

## AI アクセスガイド
- 機能概要 → README.md
- プロンプト戦略 → 001_ai_SPEC.md §3.2
- 出力 schema → 001_ai_SPEC.md §3.1
- フォールバック → 001_ai_SPEC.md §4.2

## 機能性質タグ
- target_type: cross-cutting
- 基盤 (✅)
- external-api

<!-- auto-generated-end -->

<!-- user-edit-start -->
<!-- user-edit-end -->

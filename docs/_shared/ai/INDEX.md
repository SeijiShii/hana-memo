# _shared/ai ドキュメントインデックス

**最終更新**: 2026-05-24 13:55
**生成元**: /flow:feature _shared/ai (+ /flow:revise + /flow:tdd 2026-05-23 + Phase 3.5 glue 2026-05-24)
**状態**: 実装完了 (2026-05-24、OpenAI/Upstash/Vercel handler/frontend glue wiring 済。[SEC-001] closed。残 = E2E Milestone C)

<!-- auto-generated-start -->

## 機能概要
OpenAI gpt-4o-mini Vision クライアント。SDK 非依存コア (プロンプト構築 + 構造化出力パース + quota + [SEC-001] rate limit + retry) 実装済。

## ファイル一覧（番号順）
| 番号 | ファイル | 種別 | 状態 | 最終更新 | 短い説明 |
|---|---|---|---|---|---|
| 001 | [001_ai_SPEC.md](./001_ai_SPEC.md) | SPEC | 完了 | 2026-05-22 | identify-plant Edge Function + structured output schema |
| 002 | [002_ai_PLAN.md](./002_ai_PLAN.md) | PLAN | 完了 | 2026-05-22 | Phase 4 分割 (skeleton→openai→quota→front) |
| 003 | [003_ai_UNIT_TEST.md](./003_ai_UNIT_TEST.md) | UNIT_TEST | 完了 | 2026-05-22 | OpenAI mock + retry + parseStructuredOutput |
| 004 | — | E2E_TEST | スキップ (cross-cutting + 本番 API コスト) | — | capture E2E で 1 件 smoke test |
| 101 | [101_ai_IMPL_REPORT.md](./101_ai_IMPL_REPORT.md) | IMPL_REPORT | 完了 | 2026-05-24 | コア + OpenAI/Upstash/handler/frontend glue ([SEC-001] closed) |
| 102 | [102_ai_UNIT_TEST_REPORT.md](./102_ai_UNIT_TEST_REPORT.md) | UNIT_TEST_REPORT | 完了 | 2026-05-24 | 59 tests (コア 37 + glue 22) / [SEC-001] rate-limit enforcement 検証 |

## サブフォルダ
| パス | 種別 | issue/slug | 状態 | 概要 | INDEX |
|---|---|---|---|---|---|
| `revise_sec_001-003_rate_limit_ssrf_20260523/` | revise | sec_001-003_rate_limit_ssrf | 実装完了 (TDD fold-in) | [SEC-001] rate limit コア (rate-limit.ts) + [SEC-003] SSRF (helpers/url.ts 再利用) | [INDEX](./revise_sec_001-003_rate_limit_ssrf_20260523/INDEX.md) |

## 関連
- 親 concept: `../../concept.md` §1.3.2, §3, §6
- **依存**: `_shared/types/ai`, `_shared/auth` (JWT), `_shared/db` (discoveries), `_shared/analytics` (cost log), `_shared/storage` (signed URL)
- **被依存**: `capture` (識別呼出), `(将来) memory` (レコメンド精度向上)
- 実装コード (コア): `src/shared/ai/{errors,prompt,schema,quota,rate-limit,retry,index}.ts` (SSRF は `helpers/url.ts` 再利用)
- 実装コード (glue、2026-05-24): `api/identify-plant.ts` (runIdentify orchestration) + `api/_lib/{ratelimit,openai}.ts` + `src/shared/ai/identify.ts` (resolveUserId は `api/_lib/user.ts` 共有)
- 残 (Milestone C): 実 Upstash/OpenAI への E2E smoke (Vercel preview)

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

# _shared/auth ドキュメントインデックス

**最終更新**: 2026-05-24
**生成元**: /flow:feature _shared/auth + /flow:tdd (2026-05-23 コア) + /flow:auto Milestone B (2026-05-24 SDK glue)
**状態**: 実装完了 (コア 2026-05-23 + Clerk/fingerprint/Vercel glue 2026-05-24 Milestone B、E2E は Milestone C)

<!-- auto-generated-start -->

## 機能概要
Clerk Guest Users β + Google OAuth Linking。SDK 非依存コア (trial 抑止 / 認可 / webhook mapping / 例外型) 実装済。

## ファイル一覧（番号順）
| 番号 | ファイル | 種別 | 状態 | 最終更新 | 短い説明 |
|---|---|---|---|---|---|
| 001 | [001_auth_SPEC.md](./001_auth_SPEC.md) | SPEC | 完了 | 2026-05-22 | initSession / linkIdentity / SPAM 抑止 / RLS 連携 |
| 002 | [002_auth_PLAN.md](./002_auth_PLAN.md) | PLAN | 完了 | 2026-05-22 | Phase 4 分割 (session→link→spam→hooks) |
| 003 | [003_auth_UNIT_TEST.md](./003_auth_UNIT_TEST.md) | UNIT_TEST | 完了 | 2026-05-22 | 全関数網羅 + 90% カバレッジ目標 |
| 004 | — | E2E_TEST | スキップ (cross-cutting) | — | account/capture/billing で間接検証 |
| 101 | [101_auth_IMPL_REPORT.md](./101_auth_IMPL_REPORT.md) | IMPL_REPORT | 実装完了 | 2026-05-24 | コア + Milestone B glue (provider/guest-session/link/spam-guard/hooks + api 3 本) |
| 102 | [102_auth_UNIT_TEST_REPORT.md](./102_auth_UNIT_TEST_REPORT.md) | UNIT_TEST_REPORT | 完了 | 2026-05-23 | 25 tests / 行 99.06% / 分岐 97.05% |

## サブフォルダ
| パス | 種別 | issue/slug | 状態 | 概要 | INDEX |
|---|---|---|---|---|---|
| [revise_001_20260525_clerk-ticket-guest-auth/](./revise_001_20260525_clerk-ticket-guest-auth/) | revise | 001 / clerk-ticket-guest-auth | 設計完了 (tdd 待ち) | 匿名サインインを実在しない Clerk Guest β → backend createUser+ticket 方式へ置換 | [INDEX](./revise_001_20260525_clerk-ticket-guest-auth/INDEX.md) |

## 関連
- 親 concept: `../../concept.md` §1.2, §1.3.2, §3, §4.1, §6
- **依存**: `_shared/db` (users + RLS)
- **被依存**: 全機能 (`legal`, `account`, `capture`, `notebook`, `billing`, `export`, `memory`)
- 関連論点: [論点-001] パスキー (v2), [論点-006] 匿名 SPAM 抑止 (採用済), [論点-007] 匿名→リンク移行 (採用済)
- 実装コード (コア): `src/shared/auth/{errors,trial,rls,webhook,index}.ts`
- 実装コード (Milestone B glue): `src/shared/auth/{provider.tsx,guest-session.ts,link.ts,spam-guard.ts,hooks.ts}` + `api/_lib/clerk.ts` / `api/clerk-webhook.ts` / `api/auth/spam-check.ts`
- 残: Clerk Guest β 実 sign-in 配線 + E2E (Milestone C)、fingerprint 永続化スキーマ ([論点-006] follow-up)

## AI アクセスガイド
- 機能概要 → README.md
- 起動 session → 001_auth_SPEC.md §1.1
- OAuth Linking → 001_auth_SPEC.md §1.2
- SPAM 抑止 → 001_auth_SPEC.md §1.3 / D20260522-057

## 機能性質タグ
- target_type: cross-cutting
- 基盤 (✅)
- auth

<!-- auto-generated-end -->

<!-- user-edit-start -->
<!-- user-edit-end -->

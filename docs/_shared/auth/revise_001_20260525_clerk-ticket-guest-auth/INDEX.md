# 改修 #001 ドキュメントインデックス — 匿名サインイン Clerk ticket 方式

**issue / slug**: 001 / clerk-ticket-guest-auth
**実施日**: 2026-05-25
**状態**: 実装完了 (2026-05-25、unit 919 green) — runtime 検証 (Phase 4 / release Phase 2) 待ち

<!-- auto-generated-start -->

## ファイル一覧
| 番号 | ファイル | 種別 | 最終更新 |
|---|---|---|---|
| — | README.md | 概要 | 2026-05-25 |
| 001 | 001_REVISE_SPEC.md | 変更仕様 | 2026-05-25 |
| 002 | 002_REVISE_PLAN.md | 変更計画 | 2026-05-25 |
| 003 | 003_REVISE_UNIT_TEST.md | 単体テスト計画 | 2026-05-25 |
| 004 | 004_REVISE_E2E_TEST.md | E2E テスト計画 | 2026-05-25 |
| 101 | 101_REVISE_IMPL_REPORT.md | 実装レポート | 2026-05-25 |
| 102 | 102_REVISE_UNIT_TEST_REPORT.md | 単体テストレポート | 2026-05-25 |
| (005 MIGRATION) | 不要 (スキーマ不変・α未公開) | — | — |

## 実装コード
- backend: `api/auth/guest.ts` + `api/auth/_lib/guest-provision.ts` + `api/_lib/ratelimit.ts` (createGuestRateLimiter)
- frontend: `src/shared/auth/{guest-client,useGuestSession,GuestSessionGate}` + `src/app/AppAuthProvider.tsx` (配線)

## 関連
- 親機能 INDEX: `../INDEX.md`
- 基準 SPEC: `../001_auth_SPEC.md`
- 検出/決定 AI_LOG: `../../AI_LOG/D20260525_056_handoff_default.md` (再開5c/5d)
- 本改修 AI_LOG: `../../AI_LOG/D20260525_060_revise__shared_auth_001.md`

<!-- auto-generated-end -->

<!-- user-edit-start -->
<!-- user-edit-end -->

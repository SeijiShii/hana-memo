# バグ修正 #001 ドキュメントインデックス

**issue / slug**: 001 / vercel-handler-signature
**重大度**: critical
**実施日**: 2026-05-25
**状態**: 修正済 + 検証済 (890 unit green / vercel dev 実応答 401)

<!-- auto-generated-start -->

## ファイル一覧
| 番号 | ファイル | 種別 | 最終更新 |
|---|---|---|---|
| — | README.md | 概要 | 2026-05-25 |
| 000 | 000_調査レポート.md | 調査 | 2026-05-25 |
| 001 | 001_ROOT_CAUSE.md | 根本原因 (5 Whys) | 2026-05-25 |
| 002 | 002_FIX_PLAN.md | 修正計画 (実施済) | 2026-05-25 |
| 003 | 003_REGRESSION_TEST.md | リグレッションテスト | 2026-05-25 |
| 004 | 004_POSTMORTEM.md | Postmortem (critical) | 2026-05-25 |

## 修正サマリ
- 対象: 23 `/api/*` handler を Vercel 非対応の素の default 関数形 → `export default { fetch: handler }` に変換 + `vercel.json` runtime 無効値削除
- 実装: `api/**/*.ts` (23 file) + `api/_handler-contract.test.ts` (新規, 契約テスト) + `vercel.json`
- 検証: typecheck 0 / unit 865→890 green / vercel dev `/api/storage/upload-url` hang→401

## 関連
- 親 INDEX: `../INDEX.md`
- 検出: `../../../AI_LOG/D20260525_056_handoff_default.md` (再開3) / `D20260525_057_auto_continuous.md`
- fix セッション: `../../../AI_LOG/D20260525_058_fix__shared_api_handler-signature.md`

<!-- auto-generated-end -->

<!-- user-edit-start -->
<!-- user-edit-end -->

# バグ修正: 全 /api/* Vercel Function が本番で hang する handler-signature バグ

- **issue / slug**: 001 / vercel-handler-signature
- **重大度**: critical
- **実施日**: 2026-05-25
- **対象**: 横断 `api/` (Vercel Functions layer、全 feature が依存)
- **検出経緯**: `/flow:auto` D20260525_057 反復1 → `/flow:release` Phase 2 ローカル `vercel dev` 検証 (D20260525_056)
- **状態**: 修正済 + 検証済 (vercel dev 実機 + 890 unit green)

## 概要

全 23 個の `/api/*` ハンドラが Vercel 非対応の export 形 (`export default async function handler(req: Request): Promise<Response>`) を使用しており、**本番含め全 API エンドポイントが応答せず hang** する critical バグ。865 unit test は handler を直呼びせず named helper のみ import していたため契約を検証できず見逃していた。

修正: 各 handler を Vercel 対応の `export default { fetch: handler }` (fetch Web Standard export) 形に変換 (本体不変)。再発防止に export-shape 契約テスト (`api/_handler-contract.test.ts`) を追加。

## このフォルダのドキュメント

- `000_調査レポート.md` — 症状 / 再現 / 影響範囲
- `001_ROOT_CAUSE.md` — 5 Whys / 直接原因 / 根本原因 / 寄与要因
- `002_FIX_PLAN.md` — 修正対象 23 file / before-after / 副作用評価 / リリース戦略
- `003_REGRESSION_TEST.md` — 契約テスト設計 + 境界条件
- `004_POSTMORTEM.md` — critical バグ振り返り + 再発防止策

## 関連

- 検出セッション: `../../../AI_LOG/D20260525_056_handoff_default.md` (再開3) / `D20260525_057_auto_continuous.md`
- 本 fix セッション: `../../../AI_LOG/D20260525_058_fix__shared_api_handler-signature.md`
- 公式根拠: https://vercel.com/docs/functions/runtimes/node-js (2025-12-01)

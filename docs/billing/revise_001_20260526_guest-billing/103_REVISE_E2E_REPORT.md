# E2E テストレポート: billing revise_001 (guest-billing)

- **状態**: E2E green (no-key/Class-A サブセット) — 実サービス依存ジャーニーは Class B gated
- **FW**: Playwright 1.60 (`@playwright/test`)  実行コマンド: `npm run test:e2e`  対象 URL: ローカル `vite preview` (http://localhost:4173、headless Chromium = Class A)
- **入力計画**: `./004_REVISE_E2E_TEST.md`
- **last_updated**: 2026-05-26T19:02:00+09:00
- **実行者**: seiji + Claude (/flow:e2e billing、/flow:auto 反復2 から dispatch)

## journey 別結果

| journey (004 由来) | spec | 結果 | 区分 |
|---|---|---|---|
| E2E-R-01 (trial 切れ→購入導線、連携要求は出ない) の **意図** を /billing ページレベルで検証 | `e2e/billing.spec.ts` ×3 | ✅ pass | no-key (Class A) |
| └ keyless でも /billing が ¥100=10回 単発購入導線を描画 | `billing.spec.ts:20` | ✅ pass | no-key |
| └ /billing は OAuth 連携必須ゲート (mustLink) を出さない | `billing.spec.ts:43` | ✅ pass | no-key |
| └ 廃止機能 (PWYW スライダ / PDF unlock / 書き出し) が残っていない (回帰ガード) | `billing.spec.ts:53` | ✅ pass | no-key |
| E2E-R-02 (購入 → 実 Stripe Checkout(test) → 戻りで credits=10) | — | 🚫 gated | Class B (実 Stripe key + redirect) |
| E2E-R-03 (購入後 撮影→識別 で credits 9 に減る) | — | 🚫 gated | Class B (実 OpenAI/R2 + Stripe) |
| E2E-R-04 (任意 CTA「別の端末でも使う」→ Google 連携導線) | — | 🚫 gated | Class B (実 Clerk OAuth) |
| E2E-R-R1〜R4 (リンク済消費順 / Webhook 冪等 / 残高表示 / 撮影→保存) | — | 🚫 gated | Class B (実サービス) |
| E2E-R-M1 (`0003` apply で pdf_unlocked 列 drop) | — | 🚫 gated | Class B (`db:migrate` 実 Neon apply) |
| E2E-R-M2 (apply 後 pdf_unlocked 参照コードが 0) | — | ✅ 代替検証済 | no-key: schema.ts に参照 0 + typecheck clean (列参照ゼロを静的に保証) |

**no-key E2E スイート全体**: 11 passed (smoke 8 + billing 3)、2 連続実行で安定 green (flaky なし)。

## 検出した不具合 + 修正 (no-key 検証で表面化)

### [E2E-ENV-001] keyless smoke が ambient `.env.local` の実 Clerk キーで揺れる (環境起因、修正済)
- **症状**: `smoke.spec.ts` の「keyless: 認証未設定の通知バナーが出る」が full suite 実行で red。`getByRole('note', { name: '認証未設定の通知' })` が見つからない。
- **切り分け**: **テスト側/環境起因** (実装バグではない)。billing revise commits は `src/app/`・`src/App.tsx` を一切変更しておらず、`AppAuthProvider` の keyless バナーコードは不変。
- **根因**: `.env.local` にリリース準備で投入された `VITE_CLERK_PUBLISHABLE_KEY=pk_test…` を `npm run build` で Vite が inline → アプリが keyed 経路に入り keyless バナーが (正しく) 非描画。CI は `.env.local` 不在のため keyless で pass、ローカルのみ揺れていた。
- **修正**: `playwright.config.ts` の webServer ビルドを `VITE_CLERK_PUBLISHABLE_KEY= npm run build …` に変更し、ambient なキーに依らず keyless ビルドを強制 (Vite は process.env の `VITE_*` を最優先)。本 E2E スイートは no-key ジャーニー専用 (Class A) のため keyless 決定性が正。
- **関連 memory**: `vercel-dev-env-shadows-envlocal` (env shadowing の系列)。

## flaky / quarantine
- なし (no-key スイートは静的ビルド + ルート遷移のみで決定的)。

## Class B gated (本コマンド対象外、`/flow:release` Phase 2 + 実 Neon apply で実施)
- 実 Stripe Checkout(test mode) フロー / 実 Clerk guest sign-in + OAuth link / 実 R2+OpenAI 撮影→識別→保存 / `0003_drop_users_pdf_unlocked.sql` の実 Neon dev branch apply。
- これらは実 keys + (preview 実行は) Vercel preview = Class B 必須。`docs/E2E_GATE_STATUS_20260524.md` と整合。

## metrics
metrics: { wall_clock_min: 18, active_minutes: 16, tokens: ~95k, loc: 64, e2e_specs: 3, pass: 11, fail: 0, flaky: 0, build_fix: 1 }

# 実装レポート: _shared/analytics

## 実装日時
2026-05-23 17:40 (JST)

## モード
feature (base 未実装) + SEC-004 revise (Phase 0.5 PII scrubber / Phase 3.5 Slack scrub) を fold-in

## 関連ドキュメント
- [001_analytics_SPEC.md](./001_analytics_SPEC.md) — 仕様書
- [002_analytics_PLAN.md](./002_analytics_PLAN.md) — 実装計画書
- [003_analytics_UNIT_TEST.md](./003_analytics_UNIT_TEST.md) — 単体テスト項目
- [revise_sec_004_sentry_pii_scrub_20260523/](./revise_sec_004_sentry_pii_scrub_20260523/) — [SEC-004] PII スクラブ変更設計 (本実装で fold-in)
- [902_analytics_IMPL_SECURITY_CHECKLIST.md](./902_analytics_IMPL_SECURITY_CHECKLIST.md) — L2 実装前チェック (O26 PII ログ漏洩)
- [AI_LOG セッション](../../AI_LOG/D20260523_029_tdd__shared_analytics.md) — 設計判断ログ

## 注意事項
本レポートのファイルパスと行番号は実装日時時点のもの。以後の変更で行番号がずれる場合がある。

## 変更一覧

### Phase 0.5: PII scrubber + Sentry beforeSend ([SEC-004] 法令核)
- `src/shared/analytics/scrubber.ts` (新規): `scrub<T>(value)` + `PII_PATTERNS` (email / 緯度経度 / Stripe id / Clerk session / Clerk uid / カード番号 / 日本電話番号 の 7 種)。string はパターン置換、array / object は再帰、null/undefined/プリミティブは素通し、Date/RegExp は破壊しない。
- `src/shared/analytics/sentry.ts` (新規): `initSentry` / `captureException` + `scrubBeforeSend` / `scrubBeforeBreadcrumb`。`analytics_opt_in=false` で init 完全 skip、`initialScope.user.id` は `sha256Hex` で hash 化。**SDK 非依存設計** — `@sentry/browser` を直接 import せず `SentryLike` interface を注入 (実 SDK bind は app bootstrap)。

### Phase 1: cost.ts + unit-prices.ts
- `src/shared/analytics/cost.ts` (新規): `logApiUsage` (api_usage INSERT、retry 1 + fail-soft)、`estimateCost` (gpt-4o-mini 概算、純関数)、`getMonthlyUsage` (api_usage_monthly matview を service 横断集計)、`refreshMonthlyMatview` (CONCURRENTLY 再構築)。db は DI 可。
- `src/shared/analytics/unit-prices.ts` (新規): `openAiUnitPrices` / `infraUnitPrices` — .env COST_* を呼び出し時に読む (stubEnv 容易性)。

### Phase 3.5: Slack 通知 scrub 統合
- `src/shared/analytics/slack.ts` (新規): `buildSlackPayload(text)` (scrub 経由の純関数) + `notifySlack(url, text, fetch)` (URL 未設定で warn+skip、fetch 注入可)。

### barrel
- `src/shared/analytics/index.ts` (新規): 上記の公開 API を re-export。

## 実装計画からの差分

| 項目 | 内容 |
|------|------|
| 計画にない追加変更 | (1) `sentry.ts` を `SentryLike` 注入式に再設計 (`@sentry/browser` 未インストール + repo minimal-deps 方針)。(2) `slack.ts` を新設し Slack scrub をライブラリ層の純関数として切り出し (Vercel handler から消費)。(3) `db/errors.ts` の `cause` に `override` 修飾子を追加 (既存の typecheck エラー TS4115 を修正、drive-by)。 |
| 計画から省略した変更 | **api/ Vercel Cron handler 群を defer**: `api/check-quota.ts` / `api/refresh-matview.ts` / `api/export-revenue.ts` + `vercel.json`。理由: 外部 SaaS Admin API (OpenAI/R2/Neon/Clerk 使用量取得) + 未provision の env キー依存、設計上「手動 smoke test only」、`api/` 層が未 bootstrap。これらが消費する scrub / cost / 単価ロジックは本ライブラリ層 (slack.ts / cost.ts / unit-prices.ts) で testable に先行実装済。後続の api/ 層フェーズで wiring。 |
| 想定外の問題と対処 | (1) `client.ts` が `DATABASE_URL` 未設定で module-load 時 throw → cost.test は `vi.mock('../db/client')` で無効化 + DI モックでアサート。(2) `sha256Hex` が **async** (設計 snippet は sync 前提) → `initSentry` を async 化。(3) raw Error の message/stack は非列挙のため `captureException` では scrub せず、Sentry の `beforeSend` (event 変換後) で再帰スクラブする設計に修正 (Sentry の正規スクラブ点)。 |

## PR Description

### タイトル
_shared/analytics: 計測基盤 (PII scrubber + Sentry + コストログ + Slack 通知) 実装

### 概要
opt-in user のエラー監視 (Sentry)、自前 API コストログ (api_usage)、無料枠超過 Slack 通知の計測基盤を実装。[SEC-004] 個人情報保護法対応の PII スクラブ (Sentry beforeSend / Slack 通知) を核として fold-in した。

### 変更内容
- PII スクラバ `scrub<T>` (7 パターン、再帰、100% カバレッジ)
- Sentry ラッパ (opt-in ゲート / beforeSend スクラブ / uid hash 化、SDK 非依存注入式)
- コストログ (logApiUsage fail-soft / estimateCost / 月次集計 / matview refresh)
- Slack 通知の scrub 統合 (buildSlackPayload / notifySlack)
- drive-by: db/errors.ts の typecheck エラー修正

### テスト
- 新規 50 テスト全 pass、analytics 行カバレッジ 99.49% / 分岐 86.25% (scrubber/sentry/slack 100%)
- 全体 169/169 pass、typecheck clean

---

## 追記: Phase 3.5 Milestone B — glue wiring (2026-05-24, /flow:auto 反復 3)

defer していた Vercel Cron handler + Sentry 実 SDK バインディングを wiring。`@sentry/browser` install。

### 実装 (glue)
- `src/shared/analytics/sentry-client.ts` (新規): `createSentryClient` (@sentry/browser → `SentryLike`) +
  `initBrowserSentry` (VITE_SENTRY_DSN + opt-in ゲート → `initSentry` 注入)。**[SEC-004] 本番 PII scrub の wiring**
  (実 Sentry init が必ず `scrubBeforeSend` を通る)。unit test で beforeSend=scrubBeforeSend + uid hash 化を検証。
- `api/_lib/cron.ts` (新規): `assertCronAuth` (Vercel Cron `Bearer <CRON_SECRET>` 検証、fail-closed)。
- `api/refresh-matview.ts` (新規): cron 認証 → `refreshMonthlyMatview` (vercel.json 03:00)。
- `api/check-quota.ts` (新規): cron 認証 → 当月 OpenAI コスト集計 → `evaluateQuotaAlert` (予算 80% 閾値、純関数) →
  超過時 `notifySlack` (scrub 経由、vercel.json 04:00)。
- `.env.example`: `CRON_SECRET` 追加。

### [SEC-004] 進捗 (まだ closed ではない)
- ✅ analytics 側 wiring 完了: 実 Sentry beforeSend スクラブ + Slack scrub (check-quota が消費)。
- ⏳ closure 残: **legal プラポリ実装 (`/flow:tdd legal sentry-disclosure`、Phase 4)** + 実 Sentry/Slack への 1 件投げ目視 (α 公開前)。

### defer 継続
- `api/export-revenue.ts` (月次収益、非 cron / 非 SEC) は billing/export wiring フェーズへ継続 defer。

### 検証
- typecheck 0 / eslint 0 / **Vitest 497 green (新規 11)** / handler default export は E2E (Milestone C)。

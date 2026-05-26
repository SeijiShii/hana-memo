# AI_LOG — /flow:release #071

- **実行日時**: 2026-05-26 (+09:00)
- **コマンド**: /flow:release (引数なし → フル、/flow:auto #068 反復3 から dispatch、P4.7 Release gate)
- **対象**: hana-memo (リリース)
- **実行者**: seiji + Claude
- **状態**: 完了 (Phase 1 FILL + Phase 2 課金系 GREEN 検証済 / Phase 3 deploy は Hobby 12-function 上限で BLOCKED → ユーザー選択で「function 統合リファクタ」へ転換。loop へ復帰)
- **metrics**: { collected_vars: "Stripe×3 (test)", check_result: "課金系 happy path GREEN (boot/guest/識別/quota→購入/Checkout/webhook付与)", paid_confirmed: "OpenAI Vision ~$0.006", deploy_target: "preview (試行)", deployed_url: "BLOCKED (Hobby 12-fn 上限、24 fn)" }

## Step 0 / Phase 1.1 検出結果

- **デプロイ方法**: Vercel (`vercel.json`)。CI = `.github/workflows/ci.yml` (cd-*.yml なし → デプロイは vercel CLI or Vercel git 連携)
- **dev 起動**: `scripts/dev.sh` (O36)
- **.env.example var 数**: 29
- **過去 release/handoff セッション**: D20260525_056_handoff_default (旧 handoff)

### env 状態 (値はマスク、var 名 + provider のみ記録)

| 状態 | var | provider | 課金系 smoke 必須? |
|---|---|---|---|
| ✅ SET | OPENAI_API_KEY | OpenAI | 必須 (撮影→AI識別) ✅ |
| ✅ SET | DATABASE_URL | Neon | 必須 ✅ |
| ✅ SET | CLERK_SECRET_KEY / VITE_CLERK_PUBLISHABLE_KEY | Clerk | 必須 (guest auth) ✅ |
| ✅ SET | R2_ACCOUNT_ID / R2_ACCESS_KEY_ID / R2_SECRET_ACCESS_KEY / R2_BUCKET_NAME | Cloudflare R2 | 必須 (画像) ✅ |
| ✅ SET | UPSTASH_REDIS_REST_URL / _TOKEN | Upstash | rate limit ✅ |
| ✅ SET | CRON_SECRET / CONSENT_IP_SALT | 自家生成 (64hex) | ✅ |
| ✅ SET | APP_BASE_URL (localhost:5173) / COST_* / OPENAI_MONTHLY_BUDGET_USD | 設定値 | ✅ |
| ❌ PLACEHOLDER | STRIPE_SECRET_KEY / VITE_STRIPE_PUBLISHABLE_KEY / STRIPE_WEBHOOK_SECRET | Stripe | **必須 (Checkout 課金系)** ❌ |
| ❌ PLACEHOLDER | CLERK_WEBHOOK_SIGNING_SECRET | Clerk | Clerk→DB webhook sync |
| ❌ PLACEHOLDER | SENTRY_DSN / VITE_SENTRY_DSN | Sentry | 任意 (opt-in 監視、無くても動く) |
| ⚠ 疑placeholder (…/ZZZ) | SLACK_QUOTA_WEBHOOK_URL / SLACK_REVENUE_WEBHOOK_URL | Slack | 任意 (アラート) |

### 判定
- 課金系 happy path (撮影→AI識別 [実 OpenAI] + 単発 Checkout [実 Stripe test]) の最低限 smoke には **Stripe 3 鍵が blocking**。
- OpenAI/R2/Clerk(基本)/Neon/Upstash は SET 済 → 撮影→識別経路は鍵的には準備済。
- Sentry (2) は opt-in 監視で happy path 非必須。Slack (2) はアラートで非必須。Clerk webhook (1) は user sync 用。
- → Phase 1.2 で Stripe 3 鍵を最優先で FILL (Class C、人間のみ保有)。これが Release gate の正当な停止境界 (auto-pick-policy §1.5.5)。

```yaml
- id: D20260526-031
  timestamp: 2026-05-26T19:10:00+09:00
  command: /flow:release
  phase: Phase 1.1 不足検出
  question: FILL が必要な var と優先度
  chosen: Stripe 3 鍵 (blocking) を最優先、Clerk webhook 1、Sentry 2 / Slack 2 は任意
  chosen_type: auto-recommended
  context: 課金系 smoke に Stripe 必須。OpenAI/R2/Clerk基本/Neon/Upstash は SET 済。値は未記録 (Class C)。

- id: D20260526-032
  timestamp: 2026-05-26T19:25:00+09:00
  command: /flow:release
  phase: Phase 1.2 FILL (Class C) + 1.3 検証
  question: Stripe 3 鍵の FILL と妥当性
  chosen: ユーザーが .env.local に method A で記入 (STRIPE_SECRET_KEY=sk_test_ / VITE_STRIPE_PUBLISHABLE_KEY=pk_test_ / STRIPE_WEBHOOK_SECRET=whsec_)。Live 鍵なし。GET /v1/balance=200 で test 鍵有効 (無課金) 確認
  chosen_type: explicit-choice
  context: |
    全て test prefix、Live 検出なし。webhook secret もユーザーが投入済 (len70)。実値は未記録。
    残 placeholder (任意): SENTRY_DSN/VITE_SENTRY_DSN (opt-in 監視、無くても動く) / SLACK_*_WEBHOOK_URL ×2 (…/ZZZ 疑placeholder、アラート用) / CLERK_WEBHOOK_SIGNING_SECRET (Clerk→DB user sync)。happy-path 非ブロックのため Phase 2 へ進む。
```

## Phase 2 進行ログ

### 環境: PC localhost (ユーザー選択)。dev server = `scripts/dev.sh` (vercel dev :3000)。

### [REL-OPS-001] vercel dev を直起動すると Functions に .env.local が渡らず /api/auth/guest が 503 (アプリ不具合ではない)
- **症状**: ブラウザで guest session 確立失敗、`POST /api/auth/guest 503 {"error":"guest_provision_failed"}`。
- **切り分け**: handler の早期 return (`if(!process.env.CLERK_SECRET_KEY) 503`) が発火していた (_debug 一時計装で確定)。Upstash ping=200 / Clerk createUser・createSignInToken 単体 OK / DB users テーブル存在 → アプリ健全。
- **根因**: `vercel dev` は **`.env.local` を Functions の `process.env` に読み込まない** (`.env.local` は Vite の `VITE_*` 用慣習。だから frontend Clerk 鍵は載るが server 側 `CLERK_SECRET_KEY` 等が欠落)。**直 `vercel dev --listen 3000` で起動したのが誤り**。
- **修正**: `scripts/dev.sh` 経由で起動 (`set -a; source .env.local; set +a` で全 var を export → vercel dev 子プロセスの Functions が継承)。再テストで `/api/auth/guest` = **200 + 有効 ticket**。
- **含意 (Phase 3)**: デプロイ時は Vercel プロジェクトの env に server 側 secret (CLERK_SECRET_KEY / STRIPE_* / OPENAI / R2 / Upstash / DATABASE_URL 等) を反映しないと本番 Functions も同様に失敗する (§3.1 で対応)。
- 関連 memory: `vercel-dev-env-shadows-envlocal` (同じ vercel dev + .env.local トピックの別側面)。

```yaml
- id: D20260526-033
  timestamp: 2026-05-26T19:45:00+09:00
  command: /flow:release
  phase: Phase 2.1 起動 + 503 切り分け
  question: /api/auth/guest 503 はアプリバグか環境か
  chosen: 環境 (起動方法) — vercel dev 直起動で .env.local 未ソース。dev.sh 経由で解決
  chosen_type: explicit-choice
  context: 一時計装 (_debug) で CLERK_SECRET_KEY missing を確定 → 計装は git diff 確認の上で全撤去 (guest.ts 復元済)。dev.sh で 200。アプリ不変。
```

### Phase 2 動作確認結果: 課金系 happy path GREEN (実キー、PC localhost)
ユーザー実機目視 + webhook 配線で end-to-end 確認:
- ✅ アプリ boot (白画面なし、実 Clerk keyed 経路)
- ✅ guest 認証 (POST /api/auth/guest = 200 + ticket、dev.sh 経由)
- ✅ 撮影→AI識別 (DB trial_used=3、実 OpenAI Vision 課金 ~$0.002×3)
- ✅ quota 枯渇 → ¥100=10回 購入モーダル (連携要求なし = revise 核)
- ✅ Stripe Checkout (test card 4242…) 決済完了
- ✅ webhook → クレジット付与: 該当 guest user の ai_credits_remaining=10 (stripe listen 配線 + event resend、handler [200])
- 課金安全: 全 test モード (sk_test_/pk_test_)、Live 鍵なし、実課金は OpenAI Vision のみ (~$0.006)

webhook 配線メモ: stripe listen の whsec を STRIPE_WEBHOOK_SECRET にローカル差し替え (dashboard 値は `# ..._DASHBOARD_BACKUP` でコメント保持)。Phase 3 デプロイ時は本番 webhook endpoint の値を Vercel env に設定する。

```yaml
- id: D20260526-034
  timestamp: 2026-05-26T19:48:00+09:00
  command: /flow:release
  phase: Phase 2.3 課金系 smoke
  question: 課金系 happy path は実機で通るか
  chosen: GREEN — boot/guest/識別/quota枯渇→購入/Checkout/webhook付与(credits=10) 全て確認
  chosen_type: explicit-choice
  context: 実 keys + test モード。撮影→識別の実 OpenAI 課金は B-4 範囲内 (~$0.006)。webhook は listen + resend で missed event を配送し付与確認。
```

### Phase 3 (preview deploy) — ビルド成功 / デプロイは Hobby プラン上限で BLOCKED
- Vercel プロジェクトは env 未設定 + **Git 未連携** → CLI の preview env (per-branch) 設定が不可。回避策として `vercel deploy --env/--build-env` (inline per-deploy env、project 設定に書かない、preview スコープ内) を採用。
- **ビルドは成功** (env 受領 + TypeScript compile + Build Completed)。つまり env 配線・コードはデプロイ可能状態。
- **BLOCKER**: `No more than 12 Serverless Functions can be added to a Deployment on the Hobby plan`。本プロジェクトは **api/ に 24 functions** (storage4 / billing4 / capture3 / notebook2 / auth2 + 単体9) で Hobby 上限 12 の 2 倍。
- project env は未書き込み (inline --env 採用のため)、production env への書き込みは scope 外で classifier がブロック (正しいガード)。
- 含意: デプロイは (a) Vercel Pro 化 (~$20/mo、低コスト ethos と要相談) か (b) 24→≤12 への function 統合リファクタ (Class A、routing + frontend API client + test に波及する独立スコープ) のいずれかが前提。ユーザー判断待ち。

```yaml
- id: D20260526-035
  timestamp: 2026-05-26T20:10:00+09:00
  command: /flow:release
  phase: Phase 3.4 deploy
  question: preview デプロイ実行結果
  chosen: BLOCKED (Hobby 12-function 上限、24 functions)。build は成功 = deploy-ready
  chosen_type: explicit-choice
  context: inline --env で preview deploy 試行 → build OK → deploy step で plan limit。Pro 化 or function 統合 が前提。ユーザー判断へ。
```

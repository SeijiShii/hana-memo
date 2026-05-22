# 実装前準備チェックリスト

**最終更新**: 2026-05-22 17:55 (BaaS Pivot: Supabase → Neon スタック反映)
**集約元**: §4.3 リソース選定 / §6 外部連携 / §9 法務 / §4.5 ローカル開発 / §4.4 コスト / charter §0 / perspectives O22 / O25 / O27 / O29 / O32
**生成元**: /flow:concept (Step 5.46)

> 開発運用者向け実装前準備チェックリスト。状態列 (`❌ / ✅ / △ / N/A`) は **`<!-- user-edit -->` 区間**で手動更新可。
> `<!-- auto-generated -->` 区間は concept 実行のたびに最新化される。

<!-- auto-generated-start -->

## 1. 外部 API キー (環境変数 `.env.local`)

| サービス | 環境変数名 | 用途 | 取得 URL | プラン / 無料枠 | 推奨コスト管理 |
|---|---|---|---|---|---|
| OpenAI Vision | `OPENAI_API_KEY` (Vercel Function only) | gpt-4o-mini 画像識別 | https://platform.openai.com/api-keys | 無料枠なし、$5/月推奨予算 | 月 $30 上限を check-quota Vercel Cron で監視 |
| Neon (Postgres DB) | `DATABASE_URL` (Vercel Function only) | サービス専用 DB | https://console.neon.tech | Free (0.5GB×10 DB、コンピュート 191.9h/月、auto-suspend) | コンピュート時間 + ストレージを check-quota で監視 |
| Clerk (Auth) | `VITE_CLERK_PUBLISHABLE_KEY` (frontend) / `CLERK_SECRET_KEY` (Vercel Function) / `CLERK_WEBHOOK_SIGNING_SECRET` (Vercel Function) | Guest Users β + OAuth Linking | https://dashboard.clerk.com | Free (10,000 MAU) | MAU 数を Clerk ダッシュボード + check-quota で監視 |
| Cloudflare R2 (Storage) | `R2_ACCOUNT_ID` / `R2_ACCESS_KEY_ID` / `R2_SECRET_ACCESS_KEY` (Vercel Function only) | private bucket、S3 互換 | https://dash.cloudflare.com → R2 | Free (10 GB、エグレス無料) | ストレージ容量を check-quota で監視 |
| Stripe | `STRIPE_SECRET_KEY` (Vercel Function) / `VITE_STRIPE_PUBLISHABLE_KEY` (frontend) / `STRIPE_WEBHOOK_SECRET` | PWYW + content unlock 課金 | https://dashboard.stripe.com/apikeys | Free (手数料 3.6%) | 月次 export-revenue Vercel Cron で集計 |
| Sentry | `VITE_SENTRY_DSN` | エラー監視 (opt-in user のみ) | https://sentry.io | Free (5,000 events/月) | events/月をダッシュボードで監視 |
| Slack Webhook (Quota) | `SLACK_QUOTA_WEBHOOK_URL` (Vercel Function only) | 無料枠超過通知 | https://api.slack.com/apps → Incoming Webhooks | 無料 | — |
| Slack Webhook (Revenue) | `SLACK_REVENUE_WEBHOOK_URL` (Vercel Function only) | 月次収益通知 | 同上 | 無料 | — |
| Resend (将来) | `RESEND_API_KEY` (Vercel Function only) | お問い合わせメール送信 ([論点-009] 解決後) | https://resend.com | Free (3,000 通/月、ドメイン認証必要) | 月次レビュー |

### 1.1 .env 単価 (concept §4.6.2 連携)
```
COST_OPENAI_GPT4O_MINI_PER_1K_INPUT_TOKENS=0.00015
COST_OPENAI_GPT4O_MINI_PER_1K_OUTPUT_TOKENS=0.0006
COST_OPENAI_GPT4O_MINI_IMAGE_DETAIL_LOW=0.001
COST_R2_PER_GB_PER_MONTH=0.015
COST_R2_EGRESS_PER_GB=0
COST_NEON_PER_COMPUTE_HOUR=0.16
COST_CLERK_PER_MAU_OVERAGE=0.02
COST_VERCEL_BANDWIDTH_PER_GB=0
COST_STRIPE_PER_TXN_PERCENT=3.6
```

## 2. BaaS / インフラアカウント (§4.3、charter §0 デフォルト = Neon スタック)

| サービス | 用途 | 取得 URL | プラン | 制限 |
|---|---|---|---|---|
| **Neon** | DB (Postgres、サービスごとに別 DB) | https://console.neon.tech | Free | 0.5 GB × 10 DB、コンピュート月 191.9h、auto-suspend |
| **Vercel** | ホスティング + Functions + Cron | https://vercel.com | Hobby (Free) | 100 GB 帯域、12 Functions、Cron 2 件、100k invocations/月 |
| **Clerk** | Auth プロバイダ (Guest Users β + OAuth Linking) | https://dashboard.clerk.com | Free | 10,000 MAU |
| **Cloudflare R2** | Storage (S3 互換) | https://dash.cloudflare.com → R2 | Free | 10 GB ストレージ、エグレス無料 |
| GitHub | リポジトリ + CI/CD | https://github.com | Free (private 無制限、Actions 2000 min/月) | — |
| Neon CLI | DB branch 管理 | `npm i -g neonctl` | — | — |
| Vercel CLI | deploy + Functions ローカル実行 | `npm i -g vercel` | — | — |

## 3. ドメイン (公開 PJ、§4.7 連携)

### 3.1 既存ドメインの活用 (推奨)
- 該当なし (本 PJ は新規)

### 3.2 新規ドメイン取得 (ブランディング理由で必要な時のみ)
- **判断**: MVP では取得しない (撤退リスク最小化、charter §1.1 整合)
- **α 後検討**: `hana-memo.app` (Cloudflare Registrar、~$10/年)、ユーザー数 100+ で取得

### 3.3 PaaS 提供デフォルトドメイン (検証段階)
- **採用**: `hana-memo.vercel.app` (MVP)
- **取得不要、ゼロコスト**

## 4. 認証プロバイダ設定 (perspectives O05 / O22)

| 項目 | 取得方法 | 必要性 | 備考 |
|---|---|---|---|
| Clerk App 作成 | clerk.com → New Application → Configure (Guest Users を Authentication Strategies で有効化) | **必須** (charter §1.1「気軽」採用) | `VITE_CLERK_PUBLISHABLE_KEY` + `CLERK_SECRET_KEY` を `.env.local` に |
| Clerk Guest Users β 有効化 | Clerk dashboard → User & Authentication → Guest Users (β) | **必須** | 月次匿名 user 数は Free 10k MAU に算入 |
| Google OAuth Connection | Clerk dashboard → User & Authentication → Social Connections → Google → Enable | 推奨 (デバイス間同期 / 課金時必須) | Google Cloud Console で OAuth Client を発行、Clerk が指示するコールバック URL に登録 |
| Clerk Webhook 設定 | Clerk dashboard → Webhooks → エンドポイント追加 `https://<deploy-url>/api/clerk-webhook` | 必須 (Neon users 同期) | `user.created` / `user.updated` / `user.deleted` を購読、signing secret を `.env.local` に |
| Apple Sign In | Apple Developer Program ($99/年) | 不要 (PWA 配布、App Store 配布時のみ) | v2 |
| パスキー (WebAuthn) | Clerk: Authentication Strategies → Passkeys を Enable | v2 検討 ([論点-001]) | Clerk が標準サポート |

## 5. 決済プロバイダ設定 (有償 PJ のみ、charter §1)

| 項目 | 取得方法 | 必要性 | 備考 |
|---|---|---|---|
| Stripe アカウント本人確認 | https://dashboard.stripe.com | 必須 (国内有償) | 個人事業主登記 or 法人 |
| Stripe API キー (test / live) | 上記 → API キー | 必須 | live キーは本番デプロイ後 |
| Stripe Products 登録 (¥100/20回 + PDF unlock PWYW) | Dashboard → Products | 必須 | `price_ai_credits_20`, `price_pdf_unlock_pwyw` |
| Stripe Webhook エンドポイント | Dashboard → Webhooks → `https://<deploy-url>/api/stripe-webhook` | 必須 | 署名検証鍵を `.env.local` に保存 |
| Stripe Tax (将来) | Dashboard → Tax | v2 (規模次第) | 消費税自動計算 |

## 6. 法務書類準備 (§9 / charter §3)

| 書類 | 必要性 | 配置 URL | 作成方法 |
|---|---|---|---|
| プライバシーポリシー | **必須** (公開 + 個人情報扱い) | `/legal/privacy` | `docs/legal/privacy_policy.md` ドラフト済、公開前に法務知見ある人にレビュー (BaaS 名 Supabase → Neon/Clerk/R2 に要書換) |
| 利用規約 | 必須 | `/legal/terms` | `docs/legal/terms_of_service.md` ドラフト済 |
| 特定商取引法表記 | **必須** (日本国内 + 有償) | `/legal/specified-commercial-transactions` | `docs/legal/specified_commercial_transactions.md` ドラフト済、所在地・連絡先要確定 |
| AI 利用同意 | 必須 (Q12.5 整合) | `/legal/ai-usage` | `docs/legal/ai_usage_consent.md` ドラフト済 |
| Cookie / トラッキング同意 | 不要 (analytics opt-in 方式採用、§4.8.9 整合) | — | バナーなし、設定で opt-in |

## 7. 監視・アナリティクス (perspectives O01 / O02)

| サービス | 用途 | 取得 URL | プラン |
|---|---|---|---|
| Sentry | エラー監視 | https://sentry.io | Free (5,000 events/月)、analytics_opt_in=true user のみ送信 |
| Vercel Analytics | ページビュー / Web Vitals | Vercel Dashboard | Free (Hobby tier 内) |
| 自前 api_usage table | OpenAI コスト追跡 | Neon | Free (DB 内) |
| GA4 / PostHog | (MVP 不採用) | — | [論点-005] α 後判断 |

## 8. メール送信プロバイダ (perspectives O07、通知ある時)

| サービス | 用途 | プラン |
|---|---|---|
| Resend (将来) | お問い合わせ返信 / 撤退告知 | Free (3,000 通/月、ドメイン認証必要) |
| Clerk Email (代替) | OAuth 関連メール (verification 等) | Clerk Free 枠内 |

## 9. ボット対策 (perspectives O27、公開フォームある時)

| サービス | 用途 | プラン |
|---|---|---|
| 自前 device fingerprint (@fingerprintjs/fingerprintjs OSS) | 匿名 SPAM 抑止 | Free (OSS 版) |
| Cloudflare Turnstile (将来) | お問い合わせフォーム ([論点-009] 解決後) | Free (1M req/月) |

## 10. ローカル開発環境準備 (§4.5)

| 項目 | コマンド / 手順 |
|---|---|
| Node.js | nvm で v20+ |
| Vercel CLI | `npm i -g vercel` → `vercel link` |
| Neon CLI | `npm i -g neonctl` → `neonctl auth` |
| Drizzle Kit | `npm i drizzle-orm drizzle-kit pg` (deps) |
| `.env.example` 作成 | 上記 §1 のキー名をダミー値付きで列挙 |
| `.env.local` 作成 | `.env.example` をコピー、実値を入力、`.gitignore` 確認 |
| `.gitignore` | `.env*.local`, `.env`, `dist/`, `node_modules/`, `exports/` を含む |
| Git pre-commit hook | husky + lint-staged (typecheck + eslint)、gitleaks 推奨 |
| Neon dev branch 作成 | `neonctl branches create --name dev` (本番 DB の Copy-on-Write clone) |
| 起動 (フロントのみ) | `npm run dev` |
| 起動 (Functions 込み) | `vercel dev` |
| マイグレーション生成 | `npx drizzle-kit generate` |
| マイグレーション適用 | `npx drizzle-kit migrate` |

## 11. コスト試算 (§4.4 由来)

- **初期コスト**: $0 (Vercel + Neon + Clerk + R2 + GitHub 全て Free 枠)
- **月額目安 (DAU 0、開発中)**: $0
- **月額目安 (DAU 50、α)**: $0-5 (OpenAI のみ、$30 予算内)
- **月額目安 (DAU 500、β)**: $30-100 (OpenAI $30 + Neon Launch $19 検討 + Clerk Pro $25 if 10k MAU 超過 + R2 従量 $1-5)
- **無料枠超過アラート設定** (perspectives O04): check-quota Vercel Cron Function (`_shared/analytics`) で 80% / 100% / 120% で Slack 通知

## 12. 実装着手前 最終チェックリスト

- [ ] §1-§9 の必須項目すべて取得済み (状態列 ✅)
- [ ] `.env.example` が作成され、必須キーが全て定義されている
- [ ] `.gitignore` に `.env*.local` / `.env` が追加されている (perspectives O25)
- [ ] 法務書類 (4 種) のドラフトが `docs/legal/` に置かれている (公開前最終確認用、BaaS 名要更新)
- [ ] `~/.claude/flow-data/preferences.md` に「採用したベンダー」が記録されている (Neon スタックを追加)
- [ ] `/flow:secure` で L1 設計レビューを実施済み (Critical/High リスクなし)
- [ ] CI に Dependabot を組み込み (perspectives O28)
- [ ] Neon dev branch + Clerk dev key + R2 dev bucket + Vercel dev (`vercel dev`) で全機能をローカル確認
- [ ] Clerk Guest Users β + linkIdentity の動作確認 (匿名 → Google OAuth Linking → 同 uid 維持)

<!-- auto-generated-end -->

<!-- user-edit-start -->

## ユーザー手動メモ (auto-generated で保護)

### 取得状況 (状態列)

| 項目 | 状態 | 取得日 / 備考 |
|---|---|---|
| OPENAI_API_KEY | ❌ | |
| Neon プロジェクト + dev branch | ❌ | プロジェクト名 `hana-memo` |
| Clerk アプリケーション + Guest Users 有効化 | ❌ | β 申請が必要な場合あり |
| Cloudflare R2 bucket `plant-images` (private) | ❌ | エグレス無料を活用 |
| Stripe アカウント本人確認 | ❌ | 個人事業主登記検討 |
| Google OAuth Client (Clerk 接続用) | ❌ | |
| Sentry プロジェクト | ❌ | |
| Slack Webhook (quota + revenue) | ❌ | |
| Vercel プロジェクト + GitHub 連携 | ❌ | |
| GitHub リポジトリ | ✅ | 2026-05-22 取得 (https://github.com/SeijiShii/hana-memo) |
| 法務書類レビュー | ❌ | 公開前に法務知見ある人へ、BaaS 名要更新 (Supabase → Neon/Clerk/R2) |
| 特商法 所在地・連絡先 | ❌ | 個人事業主の住所開示問題、要判断 |

### その他メモ
- ドメイン取得は α 後判断
- お問い合わせフォームは [論点-009] 確定後 (Resend 自前案推奨)
- Neon の auto-suspend で開発中の無使用時にコンピュート時間を節約

<!-- user-edit-end -->

# 実装前準備チェックリスト

**最終更新**: 2026-05-22 16:15
**集約元**: §4.3 リソース選定 / §6 外部連携 / §9 法務 / §4.5 ローカル開発 / §4.4 コスト / charter / perspectives O22 / O25 / O27
**生成元**: /flow:concept (Step 5.46)

> 開発運用者向け実装前準備チェックリスト。状態列 (`❌ / ✅ / △ / N/A`) は **`<!-- user-edit -->` 区間**で手動更新可。
> `<!-- auto-generated -->` 区間は concept 実行のたびに最新化される (項目自体は再生成、ステータスはユーザー編集が保護対象)。

<!-- auto-generated-start -->

## 1. 外部 API キー (環境変数 `.env.local`)

| サービス | 環境変数名 | 用途 | 取得 URL | プラン / 無料枠 | 推奨コスト管理 |
|---|---|---|---|---|---|
| OpenAI Vision | `OPENAI_API_KEY` (Edge Fn のみ) | gpt-4o-mini 画像識別 | https://platform.openai.com/api-keys | 無料枠なし、$5/月推奨予算 | 月 $30 上限を check-quota Edge Fn で監視 |
| Supabase | `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` (frontend) / `SUPABASE_SERVICE_ROLE_KEY` (Edge Fn) | Auth + DB + Storage | https://supabase.com/dashboard | Free (500MB DB / 1GB Storage / 50k MAU) | Storage / DB 使用量を check-quota で監視 |
| Stripe | `STRIPE_SECRET_KEY` (Edge Fn) / `VITE_STRIPE_PUBLISHABLE_KEY` (frontend) / `STRIPE_WEBHOOK_SECRET` | PWYW + content unlock 課金 | https://dashboard.stripe.com/apikeys | Free (手数料 3.6%) | 月次 export-revenue Edge Fn で集計 |
| Sentry | `VITE_SENTRY_DSN` | エラー監視 (opt-in user のみ) | https://sentry.io | Free (5,000 events/月) | events/月をダッシュボードで監視 |
| Slack Webhook | `SLACK_QUOTA_WEBHOOK_URL` / `SLACK_REVENUE_WEBHOOK_URL` | 無料枠超過 + 月次収益通知 | https://api.slack.com/apps → Incoming Webhooks | 無料 | — |
| Resend (将来) | `RESEND_API_KEY` | お問い合わせメール送信 ([論点-009] 解決後) | https://resend.com | Free (3,000 通/月、ドメイン認証必要) | 月次レビュー |

### 1.1 .env 単価 (concept §4.6.2 連携)
```
COST_OPENAI_GPT4O_MINI_PER_1K_INPUT_TOKENS=0.00015
COST_OPENAI_GPT4O_MINI_PER_1K_OUTPUT_TOKENS=0.0006
COST_OPENAI_GPT4O_MINI_IMAGE_DETAIL_LOW=0.001
COST_SUPABASE_STORAGE_PER_GB_PER_MONTH=0.021
COST_VERCEL_BANDWIDTH_PER_GB=0
COST_STRIPE_PER_TXN_PERCENT=3.6
```

## 2. BaaS / インフラアカウント (§4.3)

| サービス | 用途 | 取得 URL | プラン | 制限 |
|---|---|---|---|---|
| Vercel | Frontend Hosting (PWA) | https://vercel.com | Hobby (Free) | 100GB Bandwidth/月、unlimited build |
| Supabase | BaaS (Auth + DB + Storage + Edge Fn) | 上記 | Free | 500MB DB / 1GB Storage / 2M Edge Fn invocations/月 |
| Cloudflare DNS (将来) | DNS 管理 (ドメイン取得時) | https://dash.cloudflare.com | Free | — |
| GitHub | リポジトリ + CI/CD | https://github.com | Free (private 無制限、Actions 2000 min/月) | — |

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
| Supabase Anonymous Auth 有効化 | Supabase Dashboard → Auth → Providers → Anonymous sign-ins を ON | **必須** (charter §1.1「気軽」採用) | 月次匿名 user 数制限注意 (Supabase の上限) |
| Google OAuth Client ID | https://console.cloud.google.com → API & Services → Credentials | 推奨 (デバイス間同期 / 課金時必須) | コールバック URL `https://<deploy-url>/auth/callback` |
| Google OAuth Secret | 同上 | 同上 | Supabase Dashboard → Auth → Providers → Google に登録 |
| Apple Sign In | Apple Developer Program ($99/年) | 不要 (PWA 配布、App Store 配布時のみ) | v2 |
| パスキー (WebAuthn) | (なし) | v2 検討 ([論点-001]) | Supabase Auth 標準サポート |

## 5. 決済プロバイダ設定 (有償 PJ のみ、charter §1)

| 項目 | 取得方法 | 必要性 | 備考 |
|---|---|---|---|
| Stripe アカウント本人確認 | https://dashboard.stripe.com | 必須 (国内有償) | 個人事業主登記 or 法人 |
| Stripe API キー (test / live) | 上記 → API キー | 必須 | live キーは本番デプロイ後 |
| Stripe Products 登録 (¥100/20回 + PDF unlock PWYW) | Dashboard → Products | 必須 | `price_ai_credits_20`, `price_pdf_unlock_pwyw` |
| Stripe Webhook エンドポイント | Dashboard → Webhooks → `https://<project>.supabase.co/functions/v1/stripe-webhook` | 必須 | 署名検証鍵を `.env.local` に保存 |
| Stripe Tax (将来) | Dashboard → Tax | v2 (規模次第) | 消費税自動計算 |

## 6. 法務書類準備 (§9 / charter §3)

| 書類 | 必要性 | 配置 URL | 作成方法 |
|---|---|---|---|
| プライバシーポリシー | **必須** (公開 + 個人情報扱い) | `/legal/privacy` | `docs/legal/privacy_policy.md` ドラフト済、公開前に法務知見ある人にレビュー |
| 利用規約 | 必須 | `/legal/terms` | `docs/legal/terms_of_service.md` ドラフト済 |
| 特定商取引法表記 | **必須** (日本国内 + 有償) | `/legal/specified-commercial-transactions` | `docs/legal/specified_commercial_transactions.md` ドラフト済、所在地・連絡先要確定 |
| AI 利用同意 | 必須 (Q12.5 整合) | `/legal/ai-usage` | `docs/legal/ai_usage_consent.md` ドラフト済 |
| Cookie / トラッキング同意 | 不要 (analytics opt-in 方式採用、§4.8.9 整合) | — | バナーなし、設定で opt-in |

## 7. 監視・アナリティクス (perspectives O01 / O02)

| サービス | 用途 | 取得 URL | プラン |
|---|---|---|---|
| Sentry | エラー監視 | https://sentry.io | Free (5,000 events/月)、analytics_opt_in=true user のみ送信 |
| Vercel Analytics | ページビュー / Web Vitals | Vercel Dashboard | Free (Hobby tier 内) |
| 自前 api_usage table | OpenAI コスト追跡 | Supabase | Free (DB 内) |
| GA4 / PostHog | (MVP 不採用) | — | [論点-005] α 後判断 |

## 8. メール送信プロバイダ (perspectives O07、通知ある時)

| サービス | 用途 | プラン |
|---|---|---|
| Resend (将来) | お問い合わせ返信 / 撤退告知 | Free (3,000 通/月、ドメイン認証必要) |
| Supabase Auth Email (代替) | OAuth コールバックメール等 | Free 枠内 |

## 9. ボット対策 (perspectives O27、公開フォームある時)

| サービス | 用途 | プラン |
|---|---|---|
| 自前 device fingerprint (@fingerprintjs/fingerprintjs OSS) | 匿名 SPAM 抑止 | Free (OSS 版) |
| Cloudflare Turnstile (将来) | お問い合わせフォーム ([論点-009] 解決後) | Free (1M req/月) |

## 10. ローカル開発環境準備 (§4.5)

| 項目 | コマンド / 手順 |
|---|---|
| Node.js | nvm で v20+ |
| Supabase CLI | `npm i -g supabase` → `supabase init` → `supabase start` (Docker 必須) |
| Vercel CLI | `npm i -g vercel` → `vercel link` (任意、deploy preview 用) |
| `.env.example` 作成 | 上記 §1, §4, §5, §7 のキー名をダミー値付きで列挙 |
| `.env.local` 作成 | `.env.example` をコピー、実値を入力、`.gitignore` 確認 |
| `.gitignore` | `.env*.local`, `.env`, `dist/`, `node_modules/`, `exports/` を含む |
| Git pre-commit hook | husky + lint-staged (typecheck + eslint)、gitleaks 推奨 |

## 11. コスト試算 (§4.4 由来)

- **初期コスト**: $0 (Vercel + Supabase + GitHub 全て Free 枠)
- **月額目安 (DAU 0、開発中)**: $0
- **月額目安 (DAU 50、α)**: $0-5 (OpenAI のみ、$30 予算内)
- **月額目安 (DAU 500、β)**: $30-80 (Supabase Pro $25 + OpenAI $30 + Sentry Team $26 検討)
- **無料枠超過アラート設定** (perspectives O04): check-quota Edge Function (`_shared/analytics`) で 80% / 100% / 120% で Slack 通知

## 12. 実装着手前 最終チェックリスト

- [ ] §1-§9 の必須項目すべて取得済み (状態列 ✅)
- [ ] `.env.example` が作成され、必須キーが全て定義されている
- [ ] `.gitignore` に `.env*.local` / `.env` が追加されている (perspectives O25)
- [ ] 法務書類 (4 種) のドラフトが `docs/legal/` に置かれている (公開前最終確認用)
- [ ] `~/.claude/flow-data/preferences.md` に「採用したベンダー」が記録されている (将来 PJ のため)
- [ ] `/flow:secure` で L1 設計レビューを実施済み (Critical/High リスクなし) ← 着手前推奨
- [ ] CI に Dependabot を組み込み (perspectives O28)

<!-- auto-generated-end -->

<!-- user-edit-start -->

## ユーザー手動メモ (auto-generated で保護)

### 取得状況 (状態列)

| 項目 | 状態 | 取得日 / 備考 |
|---|---|---|
| OPENAI_API_KEY | ❌ | |
| Supabase プロジェクト | ❌ | |
| Stripe アカウント本人確認 | ❌ | 個人事業主登記検討 |
| Google OAuth Client | ❌ | |
| Sentry プロジェクト | ❌ | |
| Slack Webhook (quota + revenue) | ❌ | |
| Vercel プロジェクト | ❌ | |
| GitHub リポジトリ | ❌ | private で作成 |
| 法務書類レビュー | ❌ | 公開前に法務知見ある人へ |
| 特商法 所在地・連絡先 | ❌ | 個人事業主の住所開示問題、要判断 |

### その他メモ
- ドメイン取得は α 後判断
- お問い合わせフォームは [論点-009] 確定後 (Resend 自前案推奨)

<!-- user-edit-end -->

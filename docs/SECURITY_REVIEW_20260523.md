# 設計レベル脆弱性レビュー — hana-memo プロダクト全体

**レビュー日**: 2026-05-23
**レビュー実施者**: Claude (claude-opus-4-7[1m]) + seiji
**対象**: プロダクト全体 (concept.md + 機能 7 + 横断 7)
**入力**: `docs/concept.md` + `docs/_shared/**/001_*_SPEC.md` + `docs/{account,capture,notebook,export,memory,billing,legal}/001_*_SPEC.md`
**観点ソース**: `~/.claude/flow-data/perspectives.md` O23-O28
**severity-threshold**: medium (default)
**phase**: all (L1 + L2 + L4) — L4 は依存ファイル不在で skip

---

## 1. PJ 性質判定 (7 軸)

| 軸 | 判定 | 根拠 |
|---|---|---|
| ユーザー数 | **複数ユーザー** | Clerk Guest Users + OAuth Linking、`discoveries.user_id` 紐付け |
| 公開範囲 | **公開** | Vercel Hobby 配信、α invite-only 但し Web 公開アーキ |
| 課金 | **有償** | PWYW + content-unlock (Stripe)、billing SPEC 確定 |
| 個人情報 | **扱いあり** | 画像 / 位置情報 / email (OAuth) / Stripe 連携 |
| AI 利用 | **あり** | OpenAI gpt-4o-mini Vision、`store=false` 指定済 |
| 地域 | **国内向け** | concept §9.2 で GDPR/CCPA 対象外、日本のみ |
| 開発体制 | 個人開発 | seiji 単独 |

**適用観点**: O23 / O24 / O25 / O26 / O27 / O28 — 6/6 全観点 apply (skip_if 該当なし)

---

## 2. 脆弱性パターン照合結果

### 2.1 サマリ

| severity | 件数 | §8 論点登録 |
|---|---|---|
| Critical | 2 | 2 |
| High | 2 | 2 |
| Medium | 2 | 0 (注記のみ) |
| Low | 0 | — |
| Info | 0 | — |
| **合計** | **6** | **4** |

- 法令必須カテゴリ (O26 PII ログ漏洩) 未対応: 1 件 ([SEC-004])
- L4 依存スキャン: SKIP (ロックファイル不在、TDD 着手後に `/flow:secure --phase=deps` 再実行)

### 2.2 詳細 (severity 降順)

---

#### [SEC-001] レート制限 / 公開エンドポイント認可スコープ未設計

- **observation_id**: O27_rate_limit_scope
- **severity**: **Critical**
- **照合結果**: SPEC 未対応
- **不在根拠**:
  - perspective O27 `code_signals` (`@upstash/ratelimit`, `rateLimit`, `express-rate-limit`, `@vercel/edge`) で全 SPEC を grep → ヒット 0 件
  - `_shared/auth/001_auth_SPEC.md` の対策は fingerprint + `trial_used_count` 生涯 cap のみ (時間単位の rate limit ではない)
  - `_shared/ai/001_ai_SPEC.md` には OpenAI 呼出頻度の制限なし
  - `billing/001_billing_SPEC.md` の Stripe Webhook も署名検証はあるが頻度制限なし
- **PJ 性質との関連**: `require=[公開]` + AI 利用あり (コスト爆発リスク連動)
- **推奨対策**:
  1. **AI 同定 (`/api/identify-plant`)**: Upstash Ratelimit (Vercel Edge Config) で IP + Clerk uid 単位 `10 req/min`
  2. **Storage URL 発行 (`/api/storage/upload-url`, `/api/storage/signed-url`)**: 同じく IP 単位 `20 req/min`
  3. **Stripe Webhook (`/api/stripe-webhook`)**: 既存の Stripe 署名検証を維持、追加で IP 単位 `100 req/min`
  4. **Clerk Webhook (`/api/clerk-webhook`)**: 同上、`100 req/min`
  5. **公開エンドポイント (OGP / お問い合わせ等が将来追加された場合)**: `5 req/min` + Cloudflare Turnstile
  6. **AI 同定 5 回目以降** (匿名 user): Cloudflare Turnstile を任意挿入 (自動化攻撃対策、UX とのトレードオフは α 運用で判断)
  7. **無料枠超過アラートとの連動**: O27 を §4.6.2 のコスト追跡と統合 (check-quota Vercel Cron で `api_usage` 突発スパイク検知 → Slack 通知)
- **§8 論点登録**: **[論点-014]**
- **影響セクション**: §3 NFR / §4.3 / §4.6.2 / `_shared/auth` / `_shared/ai` / `billing`
- **chosen**: (b) §8 論点登録
- **判断期限**: `/flow:tdd` `_shared/ai` または `capture` 着手前

---

#### [SEC-002] `.env.example` 未作成 (秘密情報管理の入り口欠落)

- **observation_id**: O25_secrets_management
- **severity**: **Critical**
- **照合結果**: SPEC 対応済 / **実ファイル未作成**
- **検出根拠**:
  - `concept.md §4.5.3` で必須キー 13 件 (`OPENAI_API_KEY`, `DATABASE_URL`, `CLERK_SECRET_KEY` 等) を明文化済
  - `.gitignore` も perspective O25 準拠 (`.env`, `.env.*.local`, `secrets.*`, `*.key`, `*.pem` を除外)
  - **しかし `<root>/.env.example` は実ファイル不在** (`ls -la` で確認)
- **PJ 性質との関連**: `require=[公開]` + クラウド 5 サービス連携 (OpenAI / Clerk / Neon / R2 / Stripe)
- **不在のリスク**:
  - 新規 contributor (将来) / dev 環境再構築時に必要キー一覧が `concept.md` だけになる → 漏れて `.env.local` に直書きされる可能性
  - CI で「`.env.example` を template に dummy 値を補完する」フローが組めない
  - 「`NEXT_PUBLIC_*` / `VITE_*` プレフィックスをクライアントに露出するキーかどうか」の判定が template から消える
- **推奨対策**:
  - `<root>/.env.example` を TDD 着手と同時に作成 (concept §4.5.3 の全 13 キー + コスト単価 §4.5.3 の `COST_*` 7 件)
  - 各キーに以下を併記:
    - 取得手順 (`PREREQUISITES.md` の該当行へリンク)
    - クライアント露出可否 (`VITE_*` / `NEXT_PUBLIC_*` 接頭辞ガード)
    - 例値 (本物の値の length ヒントのみ、値そのものは入れない)
- **§8 論点登録**: **[論点-012]**
- **影響セクション**: §4.5.3 / `PREREQUISITES.md` / 全 Vercel Function
- **chosen**: (b) §8 論点登録
- **判断期限**: `/flow:tdd` `_shared/db` 着手と同時 (最初の Drizzle migration で `DATABASE_URL` 必須)

---

#### [SEC-003] AI Vision SSRF / 画像 URL 検証 (入力検証)

- **observation_id**: O24_input_validation (SSRF 観点)
- **severity**: **High**
- **照合結果**: SPEC 部分対応
- **検出根拠**:
  - `_shared/ai/001_ai_SPEC.md` は OpenAI Structured Output schema 定義あり (output validation OK)
  - `_shared/storage/001_storage_SPEC.md` で R2 Presigned URL を Vercel Function 経由発行は明示
  - **しかし、AI Vision 呼出時に渡す画像 URL が R2 Presigned に限定される保証ロジック (allowlist) が SPEC で明示されていない**
  - 将来「ユーザー指定 URL を AI に渡す」機能が追加されると SSRF 攻撃面になる (`http://169.254.169.254/` 等のメタデータエンドポイント呼出)
- **PJ 性質との関連**: `require=[公開]` + AI 利用あり (perspectives 注記: 「SSRF は AI 利用 PJ で特に重要 — 画像 URL を OpenAI Vision に渡す前に検証」)
- **推奨対策**:
  - `_shared/ai/identifyPlant` の入力契約を `objectKey: string`（R2 内のキー）に限定し、URL を呼出元から受け取らない
  - Vercel Function 内部で `getSignedUrl(objectKey, ctx.userId)` → OpenAI に渡す (URL を外部から受け取らない設計)
  - 万一 URL を user input から取る経路を追加する場合は SSRF guard 関数を `_shared/helpers/url.ts` に作成:
    - `new URL(input).hostname` を allowlist (`*.r2.cloudflarestorage.com` 等) と照合
    - private IP (`10.*` `172.16-31.*` `192.168.*` `169.254.*` `127.*` `[::1]`) 拒否
    - `file://` `gopher://` `ftp://` プロトコル拒否
    - DNS rebinding 対策 (リゾルブ後の IP を再チェック)
  - `_shared/ai/001_ai_SPEC.md §4.1` の「入力チェック」セクションに上記を明文化
- **§8 論点登録**: **[論点-013]**
- **影響セクション**: `_shared/ai` / `_shared/helpers` / `_shared/storage`
- **chosen**: (b) §8 論点登録
- **判断期限**: `/flow:tdd` `_shared/ai` 着手前

---

#### [SEC-004] Sentry `beforeSend` PII スクラブ未明示 (法令必須)

- **observation_id**: O26_pii_logging
- **severity**: **High** (legal_required=true → severity-threshold 除外不可、必須表示)
- **照合結果**: SPEC 部分対応
- **検出根拠**:
  - `_shared/analytics/001_analytics_SPEC.md §6.1` で「Clerk user id は SHA-256 hash 化して Sentry に送信」は明示
  - **しかし perspective O26 `code_signals: Sentry.beforeSend` の検索でヒット 0 件**
  - エラーオブジェクトに含まれる文字列 (e.g. `Error: invalid email seiji@example.com`, DB レスポンス全文, Stripe API レスポンス) が Sentry に流れた場合、user_id hash 化だけでは PII は除去されない
  - Slack Webhook 通知文 (`/api/check-quota`, `/api/export-revenue`) でも同じリスク
- **PJ 性質との関連**: `require=[公開, 個人情報扱い]` + legal_required=true (個人情報保護法、漏洩時は委託先漏洩扱いの可能性)
- **推奨対策**:
  - `_shared/analytics/sentry.ts initSentry` で `Sentry.init({ beforeSend })` フックを必須化
  - `beforeSend` 内でスクラブ:
    - email (`/\b[\w.+-]+@[\w.-]+\.\w+\b/gi` → `***@***`)
    - 緯度経度 (`/\b-?\d{1,3}\.\d{4,}\b/g` → `<lat>` `<lng>`)
    - Stripe id (`/\b(cus|pi|cs|sub|in)_[A-Za-z0-9]+\b/g` → `<stripe_id>`)
    - Clerk session token (`/\bsess_[A-Za-z0-9_-]+\b/g` → `<clerk_session>`)
    - Clerk user id raw (`/\buser_[A-Za-z0-9]+\b/g` → `<clerk_uid>`)
  - スクラブは `event.message` / `event.exception.values[*].value` / `event.breadcrumbs` / `event.request.headers` / `event.tags` の全フィールドに再帰適用
  - **Slack Webhook 通知 (`check-quota`, `export-revenue`)** にも同じスクラブ関数を適用 (PII 監視 SaaS 委託先漏洩の範囲を Slack まで広げない)
  - `_shared/analytics/001_analytics_SPEC.md §6.1 認可 (auth-required)` に上記を追記
  - `_shared/analytics/004_analytics_E2E_TEST.md` (or UNIT_TEST) に「PII 混入エラーを送信 → スクラブ後の event を検証」テスト追加
- **§8 論点登録**: **[論点-014]**
- **影響セクション**: §3 NFR / §9.1 / §9.2 / `_shared/analytics`
- **chosen**: (b) §8 論点登録
- **判断期限**: `/flow:tdd` `_shared/analytics` 着手前 (α 公開前必須)

---

#### [SEC-005] Drizzle 認可テスト計画 (認可漏れ防御の単体テスト)

- **observation_id**: O23_authorization_check
- **severity**: **Medium**
- **照合結果**: SPEC 対応済 (方針) / **テスト計画は薄い**
- **検出根拠**:
  - `concept.md §5.2` で「Drizzle クエリで必ず `where eq(table.user_id, ctx.userId)` を強制」と明文化
  - `_shared/db/001_db_SPEC.md` でテーブル定義は完備
  - **しかし**「他人 user_id のリソースに自分の Clerk uid でアクセス → 404/403 返却」のネガティブテストが全機能の 003 (UNIT_TEST) で個別に書かれていない
- **PJ 性質との関連**: `require=[複数ユーザー]`
- **推奨対策**:
  - 各機能 `003_*_UNIT_TEST.md` に「認可ネガティブテスト (他人 uid → 403/404)」を必須項目として追記:
    - `capture` (POST `/api/identify-plant` other user's discovery_id)
    - `notebook` (GET `/api/discoveries/[id]` other user's id)
    - `export` (POST `/api/export/pdf` other user's discoveries)
    - `billing` (GET `/api/billing/usage` other user's usage)
    - `account` (PATCH `/api/user/settings` other user's user_id)
  - `_shared/db/003_db_UNIT_TEST.md` に「Drizzle helper `getOwnedDiscovery(userId, id)` が他人 id を返さない」テスト
- **§8 論点登録**: なし (Medium、SPEC 注記のみ。TDD フェーズで対応)
- **影響セクション**: 全 003 UNIT_TEST.md
- **chosen**: (a) 注記のみ
- **判断期限**: TDD 各機能着手時 (RED フェーズで認可ネガティブテストを必ず含める)

---

#### [SEC-006] Webhook 署名検証深掘り (リプレイ攻撃対策)

- **observation_id**: O24_input_validation + O23_authorization_check
- **severity**: **Medium**
- **照合結果**: SPEC 対応済 (基本検証は明示)
- **検出根拠**:
  - `billing` SPEC で Stripe Webhook の `stripe.webhooks.constructEvent(payload, sig, secret)` 利用は明示
  - `_shared/auth` SPEC で Clerk Webhook の signing secret 検証は明示
  - **しかし**両 Webhook ともリプレイ攻撃 (古いリクエストの再送) 対策が SPEC で明示されていない
- **PJ 性質との関連**: `require=[公開]` + 課金 / 認証連動
- **推奨対策**:
  - Stripe: `stripe.webhooks.constructEvent` は default で 5 分の timestamp tolerance あり (引数 `tolerance` を変更しない)
  - Clerk: `svix` ライブラリの `webhook.verify(payload, headers)` は同様の検証を含む — 標準フローを維持
  - 各 Webhook で `event.id` (Stripe) / `svix_id` (Clerk) を Neon `webhook_dedupe` テーブル (新規) に INSERT (UNIQUE 制約) してリプレイ拒否
  - 各 002 PLAN.md に "Webhook idempotency table" を追記
- **§8 論点登録**: なし (Medium、L2 checklist で対応)
- **影響セクション**: `billing/002_*_PLAN.md` / `_shared/auth/002_*_PLAN.md` / `_shared/db/001_db_SPEC.md`
- **chosen**: (a) 注記のみ
- **判断期限**: TDD `billing` / `_shared/auth` 着手前

---

## 3. §8 未決事項に登録した論点

| 論点 ID | severity | title | 期限 | 担当 |
|---|---|---|---|---|
| [論点-011] | Critical | レート制限の具体的実装 (O27) | `/flow:tdd` `_shared/ai` 着手前 | seiji |
| [論点-012] | Critical | `.env.example` テンプレート作成 (O25) | `/flow:tdd` `_shared/db` 着手と同時 | seiji |
| [論点-013] | High | AI Vision の画像 URL 経路 SSRF 防御強化 (O24) | `/flow:tdd` `_shared/ai` 着手前 | seiji |
| [論点-014] | High (法令必須) | Sentry beforeSend PII スクラブ実装 (O26) | `/flow:tdd` `_shared/analytics` 着手前 | seiji |

---

## 4. L4 依存ライブラリスキャン (SKIP)

- **状態**: SKIP
- **理由**: `<root>` に `package.json` / lockfile 一切不在 (TDD 着手前の設計フェーズ)
- **フォロー**:
  - `/flow:tdd` で `_shared/db` 実装 → `npm install` 後に `/flow:secure --phase=deps` を再実行
  - CI に `npm audit --audit-level=high` を組み込み (Critical/High があれば fail)
  - Dependabot 設定 `.github/dependabot.yml` (週次、Critical/High は自動 PR、Medium は ignore-major)

---

## 5. 次のステップ

### 5.1 [論点-008]〜[論点-011] の解消フロー

| 論点 | 解消手段 | コマンド |
|---|---|---|
| [論点-011] レート制限 | `_shared/ai` / `_shared/auth` の 002 PLAN.md に upstash ratelimit 追記 | `/flow:revise _shared/ai`、または PLAN を直編集 |
| [論点-012] `.env.example` | `<root>/.env.example` 新規作成 + `PREREQUISITES.md` 参照リンク | `/flow:tdd _shared/db` 内で対応 |
| [論点-013] SSRF | `_shared/ai/001_ai_SPEC.md §4.1` に SSRF guard 追記 | `/flow:revise _shared/ai` |
| [論点-014] Sentry PII | `_shared/analytics/001_analytics_SPEC.md §6.1` 拡張 + 004 E2E_TEST に検証追加 | `/flow:revise _shared/analytics` |

### 5.2 L2 チェックリスト (実装時参照)

実装着手前に必読:
- `_shared/auth/902_auth_IMPL_SECURITY_CHECKLIST.md` (O23 認可)
- `_shared/ai/902_ai_IMPL_SECURITY_CHECKLIST.md` (O24 入力検証 + SSRF)
- `_shared/storage/902_storage_IMPL_SECURITY_CHECKLIST.md` (O25 秘密情報)
- `_shared/analytics/902_analytics_IMPL_SECURITY_CHECKLIST.md` (O26 PII)
- `_shared/db/902_db_IMPL_SECURITY_CHECKLIST.md` (O27 レート制限 + Webhook 重複防止)

### 5.3 後続レベル

- **L3 コードレビュー** (実装後): Anthropic 標準 `security-review` スキル / `everything-claude-code:security-review`
- **L4 一回監査** (実装直後): `/flow:secure --phase=deps`
- **L4-cont 継続監視**: Dependabot / Renovate を `.github/dependabot.yml` に設定
- **L5 ローンチ前監査** (α 公開直前): Anthropic 標準 `security-review` で全体最終チェック

---

## 6. 関連ファイル

- AI_LOG: [./AI_LOG/D20260523_017_secure_product_wide.md](./AI_LOG/D20260523_017_secure_product_wide.md)
- 観点 SoT: `~/.claude/flow-data/perspectives.md` O23-O28
- concept §8: [./concept.md#8-未決事項論点リスト](./concept.md#8-未決事項論点リスト)
- PREREQUISITES: [./PREREQUISITES.md](./PREREQUISITES.md)
- DOC_MAP: [./DOC_MAP.md](./DOC_MAP.md)

---

## 7. 更新履歴

| 日付 | 変更概要 | 実行者 |
|---|---|---|
| 2026-05-23 | 初版作成 (`/flow:secure` プロダクト全体、L1 + L2、L4 skip) | /flow:secure |

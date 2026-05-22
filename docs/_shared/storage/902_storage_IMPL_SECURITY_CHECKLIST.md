# L2 実装前チェックリスト — _shared/storage + 全般 (O25 秘密情報管理)

> **入力**: `001_storage_SPEC.md`、`002_storage_PLAN.md`、`concept.md §4.5.3`、L1 レポート [SEC-002]
> **観点 SoT**: perspectives O25_secrets_management
> **実装着手前に必読**

---

## [O25 秘密情報管理] 実装時の注意

### 1. クライアント側に秘密キーを露出させない (プレフィックス管理)

❌ やってはいけない:
```ts
// Vite で VITE_*** プレフィックスはクライアントバンドルに含まれる
// .env.local
VITE_OPENAI_API_KEY=sk-...  // ← クライアントに露出、$$$ 流出
VITE_STRIPE_SECRET_KEY=sk_live_...  // ← 同上
VITE_R2_SECRET_ACCESS_KEY=...  // ← 同上
```

✅ 正しい実装:
```bash
# .env.local
OPENAI_API_KEY=sk-...                    # Vercel Function only (no VITE_)
STRIPE_SECRET_KEY=sk_live_...            # Vercel Function only
R2_SECRET_ACCESS_KEY=...                 # Vercel Function only
CLERK_SECRET_KEY=sk_...                  # Vercel Function only
CLERK_WEBHOOK_SIGNING_SECRET=whsec_...   # Vercel Function only
DATABASE_URL=postgresql://...            # Vercel Function only

# クライアント露出可
VITE_CLERK_PUBLISHABLE_KEY=pk_live_...   # publishable は安全
VITE_STRIPE_PUBLISHABLE_KEY=pk_live_...  # 同上
VITE_SENTRY_DSN=https://...              # DSN は公開前提
```

### 2. ハードコード禁止

❌:
```ts
const apiKey = 'sk-proj-abc123';  // ← git に残る、永久流出
```

✅:
```ts
const apiKey = process.env.OPENAI_API_KEY;
if (!apiKey) throw new Error('OPENAI_API_KEY missing');
```

### 3. ログ / エラーに秘密情報を含めない

❌:
```ts
console.error('Stripe error:', err, { secret: process.env.STRIPE_SECRET_KEY });
```

✅:
```ts
console.error('Stripe error:', err.message);  // err.message に secret が含まれていないか確認
// 含まれる可能性があるなら Sentry beforeSend で scrub (SEC-004 参照)
```

### 4. `.env.example` の運用 ([SEC-002] 解消方針)

✅ `<root>/.env.example` テンプレ:
```bash
# === Server-side only (Vercel Function env) ===

# OpenAI API (https://platform.openai.com/api-keys)
OPENAI_API_KEY=sk-proj-...               # 51 chars

# Neon Postgres (https://console.neon.tech)
DATABASE_URL=postgresql://user:pass@ep-xxx.region.aws.neon.tech/neondb?sslmode=require

# Clerk (https://dashboard.clerk.com/last-active/api-keys)
CLERK_SECRET_KEY=sk_live_...             # 51 chars (test: sk_test_...)
CLERK_WEBHOOK_SIGNING_SECRET=whsec_...   # Clerk dashboard > webhooks

# Cloudflare R2 (https://dash.cloudflare.com > R2 > Manage API Tokens)
R2_ACCOUNT_ID=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
R2_ACCESS_KEY_ID=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
R2_SECRET_ACCESS_KEY=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# Stripe (https://dashboard.stripe.com/apikeys)
STRIPE_SECRET_KEY=sk_live_...            # test: sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...          # Stripe dashboard > webhooks

# Sentry (Server-side DSN, optional)
SENTRY_DSN=https://...@o.ingest.sentry.io/...

# Slack Webhooks (alerts)
SLACK_QUOTA_WEBHOOK_URL=https://hooks.slack.com/services/...
SLACK_REVENUE_WEBHOOK_URL=https://hooks.slack.com/services/...

# === Client-side (VITE_ prefix, bundled to browser) ===

VITE_CLERK_PUBLISHABLE_KEY=pk_live_...
VITE_STRIPE_PUBLISHABLE_KEY=pk_live_...
VITE_SENTRY_DSN=https://...@o.ingest.sentry.io/...  # frontend Sentry init

# === Cost rates (concept §4.5.3) ===

COST_OPENAI_GPT4O_MINI_PER_1K_INPUT_TOKENS=0.00015
COST_OPENAI_GPT4O_MINI_PER_1K_OUTPUT_TOKENS=0.0006
COST_OPENAI_GPT4O_MINI_PER_IMAGE=0.001
COST_R2_PER_GB_PER_MONTH=0.015
COST_R2_EGRESS_PER_GB=0
COST_NEON_PER_COMPUTE_HOUR=0.16
COST_CLERK_PER_MAU_OVERAGE=0.02
```

### 5. ローテーション計画

- API キーは漏洩時に即時無効化できる窓を確保
  - OpenAI / Stripe / Clerk / Sentry → 各 dashboard で revoke 操作
  - R2 → アクセスキーペアの delete & 再発行
  - Neon `DATABASE_URL` → Neon console で reset password
- 漏洩時のチェックリストを `docs/SECURITY_RUNBOOK.md` に整備 (α 公開前)
- 定期ローテ (年 1 回) は MVP では不要、商用化時に検討

### 6. R2 Presigned URL の有効期限と user_id 縛り

✅ 実装方針 (SPEC 既決):
- PUT: 60 分有効、サーバー側で `${userId}/${uuid}.webp` キー固定
- GET: 60 分有効、`getOwnedImage(userId, imageId)` 経由でのみキー解決

### 7. Git pre-commit hook (推奨)

- `gitleaks` or `git-secrets` を `.husky/pre-commit` に組込
- secret パターン (sk-*, sk_live_*, whsec_*) を含む差分をコミット拒否

---

## チェックリスト (TDD 着手前)

### 設計
- [ ] `<root>/.env.example` を `concept §4.5.3` 全キーで作成済
- [ ] `.gitignore` で `.env`, `.env.*.local`, `secrets.*`, `*.key` 除外確認 (済)
- [ ] `process.env.XXX` 参照は全て Vercel Function 内のみ (フロント `import.meta.env.VITE_*` と分離)
- [ ] フロントに渡るキーは `VITE_*` プレフィックスで明示
- [ ] `SECURITY_RUNBOOK.md` (漏洩時手順) を α 公開前に作成予定

### 実装後 (コードレビュー前)
- [ ] `git grep -nE "sk_(live|test)_|sk-proj-|whsec_|sk_[A-Za-z0-9]{20,}"` でハードコード検出 → 0 件
- [ ] `git grep -nE "VITE_.*SECRET|VITE_.*PRIVATE"` で誤った VITE_ プレフィックス → 0 件
- [ ] `npm run build` 後の `dist/assets/*.js` を `grep -E "sk_(live|test)_"` でスキャン → 0 件
- [ ] gitleaks (or git-secrets) が pre-commit hook に組込済 (任意)

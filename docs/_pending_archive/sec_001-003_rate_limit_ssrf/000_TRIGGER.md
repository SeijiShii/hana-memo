# SEC Seed: SEC-001 + SEC-003 — _shared/ai レート制限 + SSRF 防御

**生成元**: /flow:secure --list-findings (Step L.3 dispatched-to-revise)
**生成日時**: 2026-05-23T09:29:49+09:00
**route**: dispatched-to-revise
**target command**: `/flow:revise _shared/ai --resume sec_001-003_rate_limit_ssrf`
**bundled finding 群**: [SEC-001] [論点-011] + [SEC-003] [論点-013]

---

## 1. 同梱した理由

両 finding とも `_shared/ai` SPEC / PLAN の更新が必要で、攻撃面 (公開エンドポイント `/api/identify-plant`) が同一。1 つの revise セッションでまとめて反映する方が往復が減る。SCENARIO §5 推奨ルートに整合。

| ID | severity | 観点 | 影響範囲 |
|---|---|---|---|
| [SEC-001] [論点-011] | Critical | O27_rate_limit_scope | `_shared/ai` / `_shared/auth` / `_shared/db` / `billing` |
| [SEC-003] [論点-013] | High | O24_input_validation (SSRF) | `_shared/ai` / `_shared/helpers` / `_shared/storage` |

---

## 2. [SEC-001] レート制限の具体的実装

### 概要
- 観点 ID: `O27_rate_limit_scope`
- severity: Critical
- 検出根拠: 全 SPEC を `@upstash/ratelimit` / `rateLimit` / `express-rate-limit` で grep → 0 件。fingerprint + `trial_used_count` 生涯 cap のみで時間単位 rate limit が未設計。AI コスト爆発リスク + Stripe/Clerk Webhook 攻撃面リスク

### 採用案 (concept §8 [論点-011] 推奨)
**案 A: Upstash Ratelimit (Vercel Function 統合)**
- AI 同定 `/api/identify-plant`: IP + Clerk uid 単位 **10 req/min**
- Storage URL 発行 `/api/storage/{upload-url,signed-url}`: **20 req/min**
- Stripe Webhook `/api/stripe-webhook`: 署名検証維持 + IP 単位 **100 req/min**
- Clerk Webhook `/api/clerk-webhook`: 同上 **100 req/min**
- 公開エンドポイント (将来): **5 req/min** + Cloudflare Turnstile
- AI 同定 5 回目以降 (匿名 user): Cloudflare Turnstile を任意挿入 (MVP は実装せず、α 運用で発動条件を判断)

### revise 対象 SPEC / PLAN
- `docs/_shared/ai/001_ai_SPEC.md` §4 (バリデーション・エラー) / §5 (NFR) にレート制限契約を追加
- `docs/_shared/ai/002_ai_PLAN.md` Phase 0 で middleware セットアップを追加
- `docs/_shared/db/001_db_SPEC.md` に `webhook_dedupe` テーブル追加 ([SEC-006] と合流)
- `docs/PREREQUISITES.md` §9 (既に Upstash 追記済) を確認
- 各 Vercel Function (`_shared/auth`, `billing`, `_shared/storage`) のエンドポイントに rate limit middleware 適用注記

### .env 追加キー (PREREQUISITES.md §9 既記載)
- `UPSTASH_REDIS_REST_URL` (Vercel Function only)
- `UPSTASH_REDIS_REST_TOKEN` (Vercel Function only)
- `TURNSTILE_SITE_KEY` (frontend、`VITE_` プレフィックス、将来用)
- `TURNSTILE_SECRET_KEY` (Vercel Function only、将来用)

### テスト追加 (revise UNIT_TEST / E2E_TEST)
- `/api/identify-plant` 11 req/min → 11 件目が 429 + `Retry-After` ヘッダ
- Webhook 重複 `event.id` 投入 → 2 回目は 200 (idempotent)
- 429 レスポンス契約 (`{ error: 'rate_limited', retry_at: <unix_ms> }`) 全エンドポイント統一

---

## 3. [SEC-003] AI Vision SSRF 防御強化

### 概要
- 観点 ID: `O24_input_validation` (SSRF サブ観点)
- severity: High
- 検出根拠: `_shared/ai/001_ai_SPEC.md` は OpenAI Structured Output schema (出力) はあるが、入力側で R2 Presigned URL に限定する allowlist + private IP 拒否ロジックが未明示。将来 user 指定 URL を受け取る経路追加時の SSRF 攻撃面を予防的に塞ぐ

### 採用案 (concept §8 [論点-013] 推奨)
**案 A: 入力契約を `objectKey: string` に固定 + SSRF guard は `_shared/helpers/url.ts` に共通化**
- `identifyPlant` の入力契約を `{ objectKey: string }` に限定 (URL を呼出元から受け取らない)
- Vercel Function 内部で `getSignedUrl(objectKey, ctx.userId)` を発行 → OpenAI に渡す
- `validateObjectKey(key, userId)` で `${userId}/...` プレフィックス強制 (path traversal 拒否)
- 万一 URL を user input から取る経路を追加する場合の guard 関数 `assertSafeImageUrl(url)`:
  - allowlist: `*.r2.cloudflarestorage.com` のみ
  - private IP (`10.*`, `172.16-31.*`, `192.168.*`, `169.254.*`, `127.*`, `[::1]`, `fc00:`, `fe80:`) 拒否
  - `file://`, `gopher://`, `ftp://` プロトコル拒否
  - DNS rebinding 対策 (resolve 後の IP 再チェック)

### revise 対象 SPEC / PLAN
- `docs/_shared/ai/001_ai_SPEC.md §4.1` (入力チェック) に「`objectKey` のみ受領、URL 不可」を明文化
- `docs/_shared/ai/002_ai_PLAN.md` Phase 0 で `_shared/helpers/url.ts` の新規作成を追加
- `docs/_shared/helpers/001_helpers_SPEC.md` に `assertSafeImageUrl` + `validateObjectKey` を追加
- `docs/_shared/storage/001_storage_SPEC.md` の Presigned URL 発行で `userId/...` プレフィックス強制を明文化

### テスト追加
- `objectKey = "../other_user/img.webp"` → 403
- `objectKey = "../../etc/passwd"` → 400 (path traversal)
- `assertSafeImageUrl("http://169.254.169.254/")` → throw
- `assertSafeImageUrl("file:///etc/passwd")` → throw

---

## 4. 推奨 revise 実行手順 (ユーザー手動)

```bash
# 本 seed を入力として _shared/ai 改修セッション起動
/flow:revise _shared/ai --resume sec_001-003_rate_limit_ssrf

# revise セッションが完了したら _shared/helpers も改修
/flow:revise _shared/helpers --resume sec_003_ssrf_guard
# (上記は _shared/ai の改修内で完結する可能性もあり、判断は revise 内で)
```

revise 完了後:
- 本 seed フォルダ `docs/_pending/sec_001-003_rate_limit_ssrf/` を `_pending_archive/` に移動
- concept §8 [論点-011] [論点-013] の status を `closed` に遷移 (revise の commit hash を `対応 commit` に記録)

---

## 5. 関連参照

- L1 レポート: `../../SECURITY_REVIEW_20260523.md` §2.2 [SEC-001] / [SEC-003]
- L2 チェックリスト: `../../_shared/ai/902_ai_IMPL_SECURITY_CHECKLIST.md` / `../../_shared/db/902_db_IMPL_SECURITY_CHECKLIST.md`
- concept §8: `../../concept.md` [論点-011] [論点-013]
- SCENARIO §5: `../../SCENARIO.md` 現在地カーソル
- AI_LOG (生成元): `../../AI_LOG/D20260523_019_secure_list-findings.md`

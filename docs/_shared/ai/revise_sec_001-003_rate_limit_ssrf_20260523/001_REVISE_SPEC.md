# _shared/ai 変更仕様書 (レート制限 + SSRF 防御強化)

> **改修種別**: 機能拡張 (セキュリティ要件追加)
> **issue / slug**: sec_001-003_rate_limit_ssrf
> **基準 SPEC**: [../001_ai_SPEC.md](../001_ai_SPEC.md)
> **最終更新**: 2026-05-23
> **タグ**: cross-cutting / external-api / 基盤 / **security**

---

## 1. 変更概要

`/flow:secure --list-findings` で dispatch された 2 件の SEC findings (Critical [SEC-001] レート制限 + High [SEC-003] SSRF) を `_shared/ai` SPEC に反映する。

- **[SEC-001]**: Upstash Ratelimit を `/api/identify-plant` に組み込み、AI コスト爆発を防止 (10 req/min/uid + IP)
- **[SEC-003]**: `identifyPlant` の入力契約から `imageObjectKey: string` を維持しつつ、Vercel Function 内での Presigned URL 発行を allowlist 付きに厳格化 + 共通 `assertSafeImageUrl` を `_shared/helpers/url.ts` に新設し将来 URL 受領経路の SSRF を予防

実装はまだ着手前 (Phase 3 TDD 未開始)。本改修は SPEC/PLAN/UNIT_TEST 文書レベルの先行反映。

---

## 2. 変更前 vs 変更後

### 2.1 UC 変更

| UC ID | 変更前 | 変更後 | 理由 |
|---|---|---|---|
| capture/UC1 (撮影→同定) | rate limit なし | 1 ユーザー当たり 10 req/min、超過時 429 + Retry-After ヘッダ、UI でトースト | AI コスト爆発防止 ([SEC-001]) |
| capture/UC1 異常系 | OpenAI 5xx でリトライ | 同 + 429 を捕捉 → exponential backoff (1s/2s/4s) で UI 側自動再試行 | rate limit 体験の UX |

### 2.2 入出力変更

| 対象 (API / 画面 / イベント) | 変更前 | 変更後 | 互換性 |
|---|---|---|---|
| `POST /api/identify-plant` | 入力 `IdentifyInput`、出力 `IdentifyResult` | 入力契約変わらず。出力に 429 レスポンス (`{ error: 'rate_limited', retry_at: <unix_ms> }` + `Retry-After: <seconds>` ヘッダ) を追加 | ✅ 後方互換 (新エラーコードのみ) |
| `IdentifyInput.imageObjectKey` | `R2 object key (Vercel Function 内で presigned URL 化)` の記述あり | 同上に加え、**Vercel Function 内で `validateObjectKey(key, ctx.userId)` 必須**、`${userId}/` プレフィックス強制 | ✅ 内部実装の厳格化のみ |
| `_shared/helpers/url.ts` | **未存在** | `assertSafeImageUrl(input: string): Promise<void>` + `validateObjectKey(key: string, userId: string): void` 新設 | ✅ 新規追加 |

### 2.3 データモデル変更

| エンティティ | 変更内容 | マイグレーション要否 |
|---|---|---|
| (`_shared/db` 側) `webhook_dedupe` | **新規テーブル** (id PK, source, received_at) — Webhook idempotency 用、[SEC-006] と合流 | ❌ (初期マイグレーション内、実装未着手のため migration セッション不要) |
| `api_usage` | 変更なし | — |
| `discoveries` | 変更なし | — |

### 2.4 バリデーション・エラー変更

| 対象 | 変更前 | 変更後 |
|---|---|---|
| `identify-plant` 入力チェック §4.1 | `imageObjectKey の prefix === ctx.userId` (403) | 同上に加え `validateObjectKey(key, userId)` で path traversal (`..`) 拒否 (400) |
| `identify-plant` エラーケース | E-AI-001〜E-AI-006 | + **E-AI-007 rate_limited (429)**: Upstash 判定で limit 超過、Retry-After ヘッダ付き |
| `_shared/helpers/url.ts` (新規) | — | `assertSafeImageUrl` が allowlist 不一致 / private IP / 危険プロトコル / DNS rebinding を throw |

---

## 3. 影響範囲

| 対象 | 影響度 (高/中/低) | 説明 |
|---|---|---|
| `_shared/ai` (本機能) | 高 | SPEC/PLAN/UNIT_TEST に新規セクション追加、Function ハンドラに middleware 挿入 |
| `_shared/helpers` | 中 | `url.ts` 新規ファイル + helpers SPEC に関数定義追加 |
| `_shared/db` | 中 | `webhook_dedupe` テーブル schema 追加 ([SEC-006] と合流)、初期マイグレーションに含める |
| `_shared/auth` | 低 | Clerk Webhook (`/api/clerk-webhook`) も同じ rate limit / dedupe 適用、別 revise で対応推奨 (本セッションでは _shared/ai のみ) |
| `_shared/storage` | 中 | Presigned URL 発行に `validateObjectKey` 呼出を必須化 |
| `billing` | 低 | Stripe Webhook (`/api/stripe-webhook`) も同じ rate limit / dedupe 適用、別 revise で対応推奨 |
| `capture` | 中 | UI で 429 ハンドリング (toast + exponential backoff) を追加、E2E に rate limit シナリオ追加 |

---

## 4. 後方互換性

- **互換維持**: ✅ (新エラーコード追加 + 入力契約は内部実装の厳格化のみ、外部契約は変わらず)
- **新エラーレスポンス**: 429 は HTTP 標準ステータスのため既存クライアントは "失敗" として認識可能、ベストプラクティスは UI で `Retry-After` を尊重するが、無視しても再試行ループに陥らない (limit 期間が短い)

---

## 5. ロールバック方針

- **コード revert で戻せる**: ✅ (実装着手前のため、revise SPEC レベルなら git revert で旧 SPEC に戻すのみ)
- **DB マイグレーションのロールバック**: 不要 (`webhook_dedupe` は新規テーブル、未デプロイ)
- **手順**: 旧 SPEC コミットへ git revert、Upstash インスタンス削除 (実装後にロールバックする場合)

---

## 6. リリース戦略

- **方式**: 一括 (実装着手前のため、SPEC/PLAN レベルで反映 → TDD で実装 → 初回 α 公開と同時にレート制限が有効化)
- **フィーチャーフラグ**: 不要 (新規実装、段階的有効化の必要性なし)
- **ロールアウト計画**:
  1. 設計反映 (本セッション): 2026-05-23
  2. TDD 実装: 後続 `/flow:tdd _shared/ai` セッション
  3. α 公開: SCENARIO §5 Phase 4 (期限未定、本論点解消が前提条件)

---

## 7. 詳細仕様 (新仕様)

### 7.1 詳細 UC (新仕様)

#### UC: AI 同定リクエストのレート制限 (新規)

- **アクター**: 撮影 → 同定リクエスト発行ユーザー (匿名 or OAuth リンク済)
- **前提**: Clerk JWT 有効、quota 残あり
- **メインフロー**:
  1. ユーザーが撮影 → `identifyPlant({ discoveryId, imageObjectKey, ... })` を呼出
  2. Vercel Function `/api/identify-plant` が Clerk JWT を検証 → `ctx.userId` 取得
  3. **Upstash Ratelimit** で key = `identify:${ctx.userId}` をチェック (10 req/min)
  4. 通過: 通常フローへ (quota → presigned URL → OpenAI → DB)
  5. 失敗: 429 レスポンス `{ error: 'rate_limited', retry_at: <unix_ms> }` + `Retry-After: <seconds>` ヘッダ
- **代替フロー (E-AI-007)**: 429 受領時、フロントは toast 表示 + exponential backoff (1s/2s/4s) で 3 回まで自動再試行 → それでも失敗なら手動再試行 UI
- **NFR**: Upstash 呼出は P95 < 50ms (Edge runtime 利用)、rate limit 判定で本体処理を遅延させない

### 7.2 入出力 (新仕様)

#### `POST /api/identify-plant` 入出力

- **入力**: `IdentifyInput` (変更なし、§3 参照)
- **出力**:
  - 200: `IdentifyResult` (変更なし)
  - 401: 認証失敗
  - 402: quota 超過
  - **429**: rate_limited (新規、`Retry-After` ヘッダ + body `{ error: 'rate_limited', retry_at: <unix_ms> }`)
  - 400: `validateObjectKey` 失敗 (path traversal)
  - 403: `imageObjectKey` prefix 不一致 (既存)

### 7.3 データモデル (新仕様)

`_shared/db` 側に `webhook_dedupe` テーブルを追加 ([SEC-006] と合流):

```ts
export const webhookDedupe = pgTable('webhook_dedupe', {
  id: text('id').primaryKey(),         // event.id (Stripe) or svix_id (Clerk)
  source: text('source').notNull(),    // 'stripe' | 'clerk'
  received_at: timestamp('received_at').defaultNow().notNull(),
}, (t) => ({
  cleanup_idx: index('webhook_dedupe_received_at_idx').on(t.received_at),
}));
```

> 本テーブルは `_shared/auth` / `billing` の Webhook が利用。本 revise セッションでは `_shared/db` SPEC への追加項目として PLAN.md に明示するが、`_shared/db` 自体の revise セッションは別途 `/flow:revise _shared/db sec_006_webhook_dedupe` で詳細化推奨 (任意)。

### 7.4 バリデーション・エラー (新仕様)

#### `_shared/helpers/url.ts` (新規)

```ts
const ALLOW_HOSTS = ['<account_id>.r2.cloudflarestorage.com'];  // .env で動的設定
const PRIVATE_PATTERNS = [
  /^10\./, /^172\.(1[6-9]|2\d|3[01])\./, /^192\.168\./,
  /^169\.254\./, /^127\./, /^0\./, /^::1$/, /^fc00:/, /^fe80:/,
];

export async function assertSafeImageUrl(input: string): Promise<void> {
  const url = new URL(input);  // throw on invalid
  if (!['https:'].includes(url.protocol)) throw new SsrfError('protocol');
  if (!ALLOW_HOSTS.includes(url.hostname)) throw new SsrfError('host');
  const addrs = await dns.promises.lookup(url.hostname, { all: true });
  for (const a of addrs) {
    if (PRIVATE_PATTERNS.some((re) => re.test(a.address))) throw new SsrfError('private IP');
  }
}

export function validateObjectKey(key: string, userId: string): void {
  if (key.includes('..')) throw new ValidationError('path traversal');
  if (!key.startsWith(`${userId}/`)) throw new ValidationError('userId prefix mismatch');
  if (key.length > 256) throw new ValidationError('key too long');
}

export class SsrfError extends Error { constructor(public reason: string) { super(`SSRF: ${reason}`); } }
export class ValidationError extends Error { constructor(public reason: string) { super(`Validation: ${reason}`); } }
```

#### `_shared/ai/api/identify-plant.ts` middleware 順

1. Clerk JWT 検証 → `ctx.userId` 取得
2. **Upstash Ratelimit** `key = 'identify:${ctx.userId}'`、limit=10/min → 失敗時 429
3. `validateObjectKey(input.imageObjectKey, ctx.userId)` → 失敗時 400
4. quota チェック → 失敗時 402
5. presigned URL 発行 (`_shared/storage` 経由)、内部で `assertSafeImageUrl(signedUrl)` (defense-in-depth、`ALLOW_HOSTS` 由来のため通常 pass)
6. OpenAI 呼出
7. discoveries / api_usage Drizzle 書込

### 7.5 機能固有 NFR + 既存連携 (新仕様)

| 項目 | 目標値 | 根拠 |
|---|---|---|
| Upstash Ratelimit 判定 (P95) | < 50ms (Edge runtime) | UX (rate limit 判定で本体処理を遅延させない) |
| `assertSafeImageUrl` 判定 (P95) | < 20ms (DNS lookup 込み、host allowlist hit) | UX |
| `validateObjectKey` 判定 | < 1ms (純粋な文字列処理) | — |
| rate limit 上限 (`/api/identify-plant`) | **10 req/min/uid (+ IP)** | AI コスト爆発防止 ([SEC-001]) |
| rate limit 上限 (`/api/storage/upload-url`) | 20 req/min/uid | 1 撮影で複数 URL を取得しない設計、余裕枠 |
| rate limit 上限 (Webhook `/api/stripe-webhook`, `/api/clerk-webhook`) | 100 req/min/IP | 正規 Stripe IP からのバースト許容 |
| 公開エンドポイント (将来) | 5 req/min + Cloudflare Turnstile | DDoS / ボット対策 |

### 5.2 既存連携 (追加分)

| 連携先 | 種別 | 依存内容 |
|---|---|---|
| `_shared/helpers/url` | 関数呼出 | `validateObjectKey`, `assertSafeImageUrl` |
| `Upstash Ratelimit` (新規外部 SaaS) | Redis REST API | `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN` (Vercel Function env only) |

---

## 8. タグ別追加項目

### 8.1 security (新規タグ)

- **L1 設計レビュー対応**: [SEC-001] [SEC-003] の SPEC 反映完了
- **L2 実装前チェック**: [../902_ai_IMPL_SECURITY_CHECKLIST.md](../902_ai_IMPL_SECURITY_CHECKLIST.md) を TDD 着手時に手元に置く
- **L3 実装後コードレビュー**: TDD 完了後に `everything-claude-code:security-review` で再確認
- **L4 依存スキャン**: `npm install @upstash/ratelimit @upstash/redis` 後に `/flow:secure --phase=deps`

---

## 9. 未決事項

> 本 revise セッション起因の論点はなし。SEC-001 / SEC-003 の対策方針 (案 A) は §8 [論点-011] [論点-013] で確定済。
>
> 関連:
> - [論点-011] [SEC-001] レート制限: 本 SPEC 反映により設計レベル消化、TDD 実装後に status=closed
> - [論点-013] [SEC-003] SSRF: 同上
> - [SEC-006] Webhook リプレイ攻撃対策 (Medium): `webhook_dedupe` テーブル追加で対応、本 revise 内で SPEC 反映 (§7.3)

---

## 10. 更新履歴

| 日付 | 変更概要 | 実行者 |
|---|---|---|
| 2026-05-23 | 初版作成 (`/flow:revise _shared/ai --resume sec_001-003_rate_limit_ssrf`) | /flow:revise |

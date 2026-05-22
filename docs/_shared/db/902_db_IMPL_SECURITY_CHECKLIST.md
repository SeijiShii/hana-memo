# L2 実装前チェックリスト — _shared/db (O27 レート制限 + Webhook 重複防止)

> **入力**: `001_db_SPEC.md`、`002_db_PLAN.md`、L1 レポート [SEC-001] [SEC-006]
> **観点 SoT**: perspectives O27_rate_limit_scope
> **実装着手前に必読**

---

## [O27 レート制限] 実装時の注意

### 1. AI 同定エンドポイント (`/api/identify-plant`)

❌ やってはいけない:
```ts
// レート制限なし → 攻撃者が 1 秒間に 1000 req → OpenAI コスト爆発 ($1/秒)
export default async function handler(req, res) {
  const result = await openai.chat.completions.create(...);
  return res.json(result);
}
```

✅ 正しい実装 (Upstash Ratelimit on Vercel Edge):
```ts
// api/identify-plant.ts (Edge runtime)
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(10, '1 m'),  // 10 req / min
  analytics: true,
});

export const config = { runtime: 'edge' };

export default async function handler(req: Request) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0] ?? 'anon';
  const { userId } = await verifyClerk(req);  // Clerk JWT 検証
  const key = `identify:${userId ?? ip}`;
  const { success, limit, remaining, reset } = await ratelimit.limit(key);
  if (!success) {
    return new Response(JSON.stringify({ error: 'rate_limited', retry_at: reset }), {
      status: 429,
      headers: { 'Retry-After': String(Math.ceil((reset - Date.now()) / 1000)) },
    });
  }
  // ... OpenAI 呼出
}
```

### 2. Storage URL 発行 (`/api/storage/upload-url`, `/api/storage/signed-url`)

✅ 同じく Upstash Ratelimit、`20 req / 1m` 制限 (1 撮影で複数 URL 取得しない設計だが余裕枠)

### 3. Webhook (`/api/stripe-webhook`, `/api/clerk-webhook`)

✅ 設計:
- 署名検証は最優先 (検証失敗を rate-limit より前に reject)
- 検証通過後は IP 単位 `100 req / 1m` 制限 (正規 Stripe IP からのバースト許容)
- リプレイ攻撃対策: `event.id` (Stripe) / `svix_id` (Clerk) を `webhook_dedupe` に INSERT UNIQUE 違反で拒否

```ts
// _shared/db/schema.ts (新規テーブル追加 [SEC-006] 対応)
export const webhookDedupe = pgTable('webhook_dedupe', {
  id: text('id').primaryKey(),                  // event.id or svix_id
  source: text('source').notNull(),             // 'stripe' | 'clerk'
  received_at: timestamp('received_at').defaultNow().notNull(),
}, (t) => ({
  cleanup_idx: index('webhook_dedupe_received_at_idx').on(t.received_at),
}));

// usage in webhook handler
try {
  await db.insert(webhookDedupe).values({ id: event.id, source: 'stripe' });
} catch (e) {
  if (isUniqueViolation(e)) return res.status(200).end();  // 重複は idempotent OK
  throw e;
}

// cleanup: Vercel Cron で 30 日以上前の dedupe レコードを削除
```

### 4. 公開エンドポイント (将来追加されるもの)

- OGP 生成、お問い合わせフォーム、健康チェック等
- 認証なし API は `5 req / 1m` + Cloudflare Turnstile 必須

### 5. レート制限超過時のレスポンス契約

✅ 全エンドポイント統一:
- status: `429 Too Many Requests`
- header: `Retry-After: <seconds>`
- body: `{ error: 'rate_limited', retry_at: <unix_ms> }`
- フロント側で 429 を捕捉 → トースト「混雑しています、X 秒後に再試行」+ exponential backoff

### 6. AI 同定 5 回目以降の Turnstile (匿名 user の自動化攻撃対策、任意)

```ts
// api/identify-plant.ts
const isAnonymous = !user.linked_at;
const usedCount = user.trial_used_count;
if (isAnonymous && usedCount >= 5) {
  const turnstileToken = req.headers.get('x-turnstile-token');
  if (!turnstileToken || !(await verifyTurnstile(turnstileToken, ip))) {
    return new Response(JSON.stringify({ error: 'captcha_required' }), { status: 412 });
  }
}
```

> ⚠️ MVP では実装せず、α 運用で「自動化攻撃の兆候 (急激な fingerprint 分散 + 失敗率上昇)」を検知した時点で有効化する設計を [論点-008] に含める

### 7. コスト追跡との連動 (concept §4.6.2)

- `api_usage` テーブルへの INSERT 直前にも rate limit 判定を入れる二重防御
- Vercel Cron `check-quota` で `api_usage` を 5 分粒度で監視、突発スパイク (普段の 10x) を Slack 通知

---

## チェックリスト (TDD 着手前)

### 設計
- [ ] Upstash Redis インスタンス作成 (or Vercel Edge Config) → `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN` を `.env.example` に追加
- [ ] `_shared/middleware/ratelimit.ts` を新規作成、エンドポイント別の limit 値を一元管理
- [ ] `webhook_dedupe` テーブルを `_shared/db/schema.ts` に追加 + migration
- [ ] 各 Vercel Function に Edge runtime 適用判断 (Node 20 のままなら `@upstash/ratelimit` Node 版を使用)
- [ ] 429 レスポンス契約を `_shared/types/api.ts` に共通型として定義
- [ ] フロント (`hooks/useApiClient.ts` 等) で 429 を共通ハンドリング (toast + backoff)

### テスト (RED)
- [ ] `/api/identify-plant` を 11 req/min 投げて 11 件目が 429
- [ ] 429 レスポンスに `Retry-After` ヘッダが含まれる
- [ ] `Webhook 重複 event.id` 投入 → 2 回目は 200 (idempotent) かつ DB 状態が変わらない
- [ ] Webhook 署名検証は rate-limit より前に走り、不正署名は 401 を即返す
- [ ] 異常スパイクを Vercel Cron `check-quota` が検知 → Slack mock に通知

### 実装後
- [ ] `git grep -nE "openai\\.chat\\.completions\\.create"` で全呼出が ratelimit middleware 経由になっていること
- [ ] α 公開直前に負荷試験 (`ab -n 100 -c 10 /api/identify-plant`) → 期待通り 429 が返ること

---

## [SEC-006] Webhook リプレイ攻撃対策 (Medium)

L1 レポート [SEC-006] の対応として `webhook_dedupe` テーブル + UNIQUE 制約による idempotency を本 checklist §3 に統合済。
別途切り出し不要、本 checklist 完遂で対応完了とする。

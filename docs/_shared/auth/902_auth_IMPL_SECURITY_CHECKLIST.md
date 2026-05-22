# L2 実装前チェックリスト — _shared/auth (O23 認可)

> **入力**: `001_auth_SPEC.md`、`002_auth_PLAN.md`、`concept.md §5.2`、L1 レポート [SEC-005]
> **観点 SoT**: perspectives O23_authorization_check
> **実装着手前に必読**

---

## [O23 認可漏れ] 実装時の注意

### 1. Drizzle クエリ層で `user_id = ctx.userId` 強制

❌ やってはいけない:
```ts
// ctx.userId を where に入れ忘れ → 他人のデータが見える
const discovery = await db.select().from(discoveries).where(eq(discoveries.id, discoveryId));
return discovery[0];  // 他人の id でもヒットしてしまう
```

✅ 正しい実装:
```ts
// user_id を必ず where に含める
const discovery = await db
  .select()
  .from(discoveries)
  .where(and(
    eq(discoveries.id, discoveryId),
    eq(discoveries.user_id, ctx.userId)  // ← 必須
  ));
if (!discovery[0]) return res.status(404).end();  // 404 (403 でも user_id 存在を漏らさない)
return discovery[0];
```

### 2. ctx.userId 取得は Clerk 標準フローで

❌ やってはいけない:
```ts
const userId = req.headers['x-user-id'];  // クライアントが任意設定可能、なりすまし可
```

✅ 正しい実装:
```ts
import { getAuth } from '@clerk/nextjs/server';
const { userId } = getAuth(req);  // Clerk JWT 検証済 uid
if (!userId) return res.status(401).end();
```

### 3. fingerprint + trial_used_count は SPAM 抑止のみ、認可ではない

❌ 混同してはいけない:
```ts
// fingerprint が一致しても認可ではない (匿名 user 同士の識別用)
if (user.fingerprint_hash === reqFingerprint) {
  // 認可されたつもりになる ← 間違い
}
```

✅ 正しい用法:
- `fingerprint_hash` は匿名 user の SPAM 抑止 (再生成ループ検知) のみ
- 認可は **Clerk JWT 検証** + **Drizzle where user_id** の二段で実施

### 4. Webhook の認可

❌ やってはいけない:
```ts
// Webhook を生 POST で受ける (誰でも user 作成リクエストできる)
app.post('/api/clerk-webhook', async (req, res) => {
  await db.insert(users).values(req.body);  // 任意ユーザー作れる!
});
```

✅ 正しい実装:
```ts
import { Webhook } from 'svix';
const wh = new Webhook(process.env.CLERK_WEBHOOK_SIGNING_SECRET!);
const evt = wh.verify(rawBody, headers);  // signature 検証、不正なら throw
// 検証通過後にのみ DB 反映
```

### 5. 管理機能 (将来) の隔離

- `/api/admin/*` は admin role 専用 (MVP は存在しないが、追加時は要件)
- Clerk の `publicMetadata.role === 'admin'` チェック必須
- IP allowlist (Cloudflare Access) 併用推奨

---

## チェックリスト (TDD 着手前に確認)

### 設計
- [ ] 全 Drizzle クエリで `where eq(table.user_id, ctx.userId)` を含む helper 関数を `_shared/db/` に作成済
- [ ] helper を bypass する直接 `db.select().from(...)` を ESLint で禁止 (custom rule または code review で)
- [ ] Webhook 署名検証 (svix / stripe SDK) を全 Webhook で実施
- [ ] 認可マトリクス (エンドポイント × Clerk uid 状態 (anon/linked/admin) × 許可操作) が文書化されている

### テスト (RED フェーズで含めるネガティブテスト)
- [ ] `他人 uid で GET /api/discoveries/[id]` → 404
- [ ] `他人 uid で PATCH /api/user/settings` → 403 or 404
- [ ] `他人 uid で POST /api/export/pdf` → 403
- [ ] `他人 uid で GET /api/billing/usage` → 403
- [ ] `Clerk JWT なし` → 401
- [ ] `期限切れ Clerk JWT` → 401
- [ ] `Webhook 署名なし` → 401 (生 POST 拒否)
- [ ] `Webhook 署名改ざん` → 401

### 実装後 (L3 コードレビュー時)
- [ ] `git grep -nE "db\\.select.*from"` で helper を経由していない直接クエリがないこと
- [ ] `git grep -nE "headers\\['x-user-id'\\]"` でクライアント送付 user_id 利用がないこと

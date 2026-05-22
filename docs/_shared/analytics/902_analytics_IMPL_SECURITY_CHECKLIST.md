# L2 実装前チェックリスト — _shared/analytics (O26 PII ログ漏洩 / 法令必須)

> **入力**: `001_analytics_SPEC.md`、`002_analytics_PLAN.md`、L1 レポート [SEC-004]
> **観点 SoT**: perspectives O26_pii_logging (legal_required=true)
> **実装着手前に必読 — 個人情報保護法対応の核**

---

## [O26 PII ログ漏洩] 実装時の注意

### 1. Sentry `beforeSend` フックで PII スクラブ必須

❌ やってはいけない:
```ts
Sentry.init({
  dsn: process.env.SENTRY_DSN,
  // beforeSend なし → エラーメッセージにメール / 位置 / Stripe id が含まれたまま送信
});
throw new Error(`Invalid email: ${user.email}`);  // ← Sentry に流れる
```

✅ 正しい実装:
```ts
// _shared/analytics/scrubber.ts
const PATTERNS = [
  { re: /\b[\w.+-]+@[\w.-]+\.\w+\b/gi, mask: '***@***' },                  // email
  { re: /\b-?\d{1,3}\.\d{4,}\b/g, mask: '<coord>' },                       // 緯度経度
  { re: /\b(cus|pi|cs|sub|in)_[A-Za-z0-9]+\b/g, mask: '<stripe_id>' },     // Stripe ids
  { re: /\bsess_[A-Za-z0-9_-]+\b/g, mask: '<clerk_session>' },             // Clerk session
  { re: /\buser_[A-Za-z0-9]+\b/g, mask: '<clerk_uid>' },                   // Clerk uid raw
  { re: /\b\d{3,4}-?\d{4}-?\d{4,}-?\d{4}\b/g, mask: '<card>' },            // 念のためカード番号
  { re: /\b0\d{1,4}-?\d{1,4}-?\d{4}\b/g, mask: '<phone-jp>' },             // 国内電話
];

export function scrub<T>(value: T): T {
  if (typeof value === 'string') {
    let s = value;
    for (const { re, mask } of PATTERNS) s = s.replace(re, mask);
    return s as T;
  }
  if (Array.isArray(value)) return value.map(scrub) as T;
  if (value && typeof value === 'object') {
    const out: any = {};
    for (const [k, v] of Object.entries(value)) out[k] = scrub(v);
    return out;
  }
  return value;
}

// _shared/analytics/sentry.ts
import * as Sentry from '@sentry/browser';
import { scrub } from './scrubber';

export function initSentry(user: User, opts: { dsn: string }) {
  if (!user.settings.analytics_opt_in) return;
  Sentry.init({
    dsn: opts.dsn,
    beforeSend(event) {
      return scrub(event);  // event 全体に再帰スクラブ
    },
    beforeBreadcrumb(crumb) {
      return scrub(crumb);  // breadcrumb もスクラブ
    },
    initialScope: {
      user: { id: sha256Hex(user.id) },  // Clerk uid は hash 化済を渡す
    },
  });
}
```

### 2. console.log / console.error の取り扱い

❌:
```ts
console.log('User signed up:', user);  // user.email, user.id がプレーンで stdout
// → Vercel Function logs にそのまま記録、リテンション期間中は流出リスク
```

✅:
```ts
console.log('User signed up:', { uid_hash: sha256Hex(user.id), is_anonymous: user.is_anonymous });
// PII を含まない field のみログ
```

### 3. Slack Webhook 通知のスクラブ

❌:
```ts
// check-quota.ts (Vercel Cron)
const msg = `User ${user.email} exceeded quota`;  // ← Slack に email 流出
await fetch(process.env.SLACK_QUOTA_WEBHOOK_URL!, { method: 'POST', body: JSON.stringify({ text: msg }) });
```

✅:
```ts
const msg = scrub(`User ${user.email} exceeded quota`);  // → "User ***@*** exceeded quota"
// または集計サマリのみ送信 (個別 user 名を載せない)
const msg = `Quota alert: ${exceededCount} users over 80%, total cost ${totalCost.toFixed(2)} USD`;
```

### 4. アナリティクスイベント (将来 PostHog/GA4 導入時)

- イベントプロパティに PII を入れない (anonymous_id ハッシュのみ)
- 位置情報は緯度経度ではなく「地域コード (都道府県レベル)」までに丸める
- [論点-005] α 公開後判断時にこの方針を再確認

### 5. エラーメッセージの粒度設計

- 内部例外のメッセージ (例: `Database query failed: SELECT * FROM users WHERE email='...'`) を Sentry に送らない
- API レスポンス全文を Error にラップしない
  - 例: Stripe API エラーは `{ stripe_code, stripe_request_id }` のみ含めて `customer_email` は除外
- DB エラーは `pg_error.code` (例: `23505`) のみ送り、`pg_error.detail` (実値含む) は scrub

### 6. opt-in 設計の徹底

- 匿名 user の `analytics_opt_in` は **default false** (`user_settings.analytics_opt_in bool default false`、db SPEC 既決)
- リンク後の OAuth user に対して「エラー追跡 ON 推奨」表記で opt-in 案内 (concept §6)
- opt-out 操作後は即時 `Sentry.close()` + 残存 breadcrumbs 削除

### 7. テスト (RED フェーズ必須)

```ts
// PII スクラブテスト
test('scrub email from Sentry event', () => {
  const event = { message: 'Invalid email: seiji@example.com' };
  const scrubbed = scrub(event);
  expect(scrubbed.message).toBe('Invalid email: ***@***');
});

test('scrub coordinates', () => {
  expect(scrub('lat=35.6812 lng=139.7671')).toBe('lat=<coord> lng=<coord>');
});

test('scrub Stripe customer id', () => {
  expect(scrub('cus_abc123XYZ failed')).toBe('<stripe_id> failed');
});

test('scrub nested object', () => {
  const e = { user: { email: 'x@y.com' }, msgs: ['contact 03-1234-5678'] };
  const s = scrub(e);
  expect(s.user.email).toBe('***@***');
  expect(s.msgs[0]).toBe('contact <phone-jp>');
});
```

---

## チェックリスト (TDD 着手前)

### 設計
- [ ] `_shared/analytics/scrubber.ts` を新規作成、上記 7 パターン (email/coord/stripe/clerk_session/clerk_uid/card/phone) を実装
- [ ] `initSentry` で `beforeSend` + `beforeBreadcrumb` に scrub を適用
- [ ] Sentry `initialScope.user.id` は SHA-256 hash 済 (raw Clerk uid は送らない)
- [ ] Slack Webhook 通知 (`check-quota`, `export-revenue`) で scrub を適用
- [ ] `001_analytics_SPEC.md §6.1` にこの方針を追記 ([論点-011] 解消)
- [ ] `004_analytics_E2E_TEST.md` に「PII を含むエラーを Sentry にキャプチャ → mock server で event を受け取り → PII が含まれていないこと」テスト

### 実装後
- [ ] `git grep -nE "console\\.(log|error|warn).*user\\.(email|id|firstName|lastName)"` → 0 件 (or 全件 hash 化)
- [ ] `git grep -nE "JSON\\.stringify\\(user\\)"` → 0 件 (全体 dump 禁止)
- [ ] α 公開前に Sentry の Issues 一覧で「実際に流れたイベント」を目視確認、PII が混入していないこと

### 法令対応 (個人情報保護法、本 PJ §9.2)
- [ ] プラポリ §9.1 に「Sentry をエラー追跡委託先として利用、PII はスクラブ後送信」を明記
- [ ] 同意ログ (`consent_logs`) で opt-in 状態を保持
- [ ] ユーザー開示請求時に「Sentry に送られたデータの内容」を回答できる仕組み (Sentry SDK 経由で過去 90 日分エクスポート可)

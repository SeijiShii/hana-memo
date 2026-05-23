# SEC Seed: SEC-004 — Sentry beforeSend PII スクラブ実装 (法令必須)

**生成元**: /flow:secure --list-findings (Step L.3 dispatched-to-revise)
**生成日時**: 2026-05-23T09:33:00+09:00
**route**: dispatched-to-revise
**target command**: `/flow:revise _shared/analytics --resume sec_004_sentry_pii_scrub`
**関連 finding**: [SEC-004] [論点-014]

---

## 1. 概要

- 観点 ID: `O26_pii_logging`
- severity: **High** (法令必須、severity-threshold 除外不可)
- legal_required: **true** (個人情報保護法、漏洩時は委託先漏洩扱いの可能性)
- 検出根拠: `_shared/analytics/001_analytics_SPEC.md §6.1` で Clerk user id の SHA-256 hash 化は明示。しかし perspective O26 `code_signals: Sentry.beforeSend` の grep でヒット 0 件。error.message / breadcrumb / Slack 通知文中の email / 位置 / Stripe id / Clerk session token のスクラブ機構が未設計

---

## 2. 採用案 (concept §8 [論点-014] 推奨)

**案 A**: `scrub<T>(value)` 共通関数を `_shared/analytics/scrubber.ts` に作成し、`Sentry.init({ beforeSend, beforeBreadcrumb })` + Slack 通知の両方に適用 (7 パターン)。

### スクラブパターン (7 種、L2 checklist 由来)

| パターン | 正規表現 | mask |
|---|---|---|
| email | `/\b[\w.+-]+@[\w.-]+\.\w+\b/gi` | `***@***` |
| 緯度経度 | `/\b-?\d{1,3}\.\d{4,}\b/g` | `<coord>` |
| Stripe ids | `/\b(cus|pi|cs|sub|in)_[A-Za-z0-9]+\b/g` | `<stripe_id>` |
| Clerk session | `/\bsess_[A-Za-z0-9_-]+\b/g` | `<clerk_session>` |
| Clerk uid raw | `/\buser_[A-Za-z0-9]+\b/g` | `<clerk_uid>` |
| カード番号 | `/\b\d{3,4}-?\d{4}-?\d{4,}-?\d{4}\b/g` | `<card>` |
| 国内電話 | `/\b0\d{1,4}-?\d{1,4}-?\d{4}\b/g` | `<phone-jp>` |

### scrub の適用範囲

- Sentry: `event.message` / `event.exception.values[*].value` / `event.breadcrumbs` / `event.request.headers` / `event.tags` に再帰適用
- Slack Webhook 通知 (`check-quota`, `export-revenue`) のメッセージ本文に同じ scrub 適用
- `initialScope.user.id` は SHA-256 hash 化 (既存仕様維持)

---

## 3. revise 対象ファイル

| ファイル | 変更内容 |
|---|---|
| `docs/_shared/analytics/001_analytics_SPEC.md` §6.1 | `beforeSend` + `beforeBreadcrumb` + scrub 関数の必須化を明文化 |
| `docs/_shared/analytics/002_analytics_PLAN.md` | Phase 0 で `scrubber.ts` 新規作成タスクを追加 |
| `docs/_shared/analytics/003_analytics_UNIT_TEST.md` | scrub 関数の 7 パターン正規表現テスト + nested object テスト追加 |
| `docs/_shared/analytics/004_analytics_E2E_TEST.md` | PII を含むエラーを Sentry にキャプチャ → mock server で event を受け取り → PII が含まれていないこと検証 |
| `docs/legal/001_legal_SPEC.md` (要確認) | プラポリ §9.1 に「Sentry エラー追跡委託先利用、PII はスクラブ後送信」を明記 |

---

## 4. 推奨 revise 実行手順 (ユーザー手動)

```bash
# 本 seed を入力として _shared/analytics 改修セッション起動
/flow:revise _shared/analytics --resume sec_004_sentry_pii_scrub
```

revise 完了後:
- 本 seed フォルダ `docs/_pending/sec_004_sentry_pii_scrub/` を `_pending_archive/` に移動
- concept §8 [論点-014] の status を `closed` に遷移 (revise の commit hash を `対応 commit` に記録)
- `docs/legal/001_legal_SPEC.md` のプラポリ追記も忘れずに

---

## 5. テスト追加 (revise UNIT_TEST / E2E_TEST 候補)

```ts
// _shared/analytics/scrubber.test.ts
test('scrub email from string', () => {
  expect(scrub('Invalid email: seiji@example.com')).toBe('Invalid email: ***@***');
});

test('scrub coordinates', () => {
  expect(scrub('lat=35.6812 lng=139.7671')).toBe('lat=<coord> lng=<coord>');
});

test('scrub Stripe customer id', () => {
  expect(scrub('cus_abc123XYZ failed')).toBe('<stripe_id> failed');
});

test('scrub Clerk session token', () => {
  expect(scrub('sess_2abcDEF-123')).toBe('<clerk_session>');
});

test('scrub card number', () => {
  expect(scrub('4242-4242-4242-4242 declined')).toBe('<card> declined');
});

test('scrub Japan phone', () => {
  expect(scrub('contact 03-1234-5678')).toBe('contact <phone-jp>');
});

test('scrub nested object recursively', () => {
  const event = { user: { email: 'x@y.com' }, msgs: ['contact 03-1234-5678'], coords: 'lat=35.6812' };
  const s = scrub(event);
  expect(s.user.email).toBe('***@***');
  expect(s.msgs[0]).toBe('contact <phone-jp>');
  expect(s.coords).toBe('lat=<coord>');
});

// E2E (mock Sentry server)
test('Sentry event from PII error is scrubbed', async () => {
  const mockSentry = new MockSentryServer();
  await mockSentry.start();
  Sentry.init({ dsn: mockSentry.dsn, beforeSend: scrub });
  Sentry.captureException(new Error('cus_abc123 failed for seiji@example.com'));
  await mockSentry.waitForEvent();
  const captured = mockSentry.lastEvent();
  expect(captured.exception.values[0].value).not.toContain('cus_abc123');
  expect(captured.exception.values[0].value).not.toContain('seiji@example.com');
});
```

---

## 6. 関連参照

- L1 レポート: `../../SECURITY_REVIEW_20260523.md` §2.2 [SEC-004]
- L2 チェックリスト: `../../_shared/analytics/902_analytics_IMPL_SECURITY_CHECKLIST.md`
- concept §8: `../../concept.md` [論点-014]
- 法務: `../../concept.md` §9.1 (プラポリ Sentry 委託先記載)
- SCENARIO §5: `../../SCENARIO.md` 現在地カーソル
- AI_LOG (生成元): `../../AI_LOG/D20260523_019_secure_list-findings.md`

# _shared/analytics 単体テスト計画 (Sentry beforeSend PII スクラブ実装)

> **入力**: [./001_REVISE_SPEC.md](./001_REVISE_SPEC.md), [./002_REVISE_PLAN.md](./002_REVISE_PLAN.md), [../003_analytics_UNIT_TEST.md](../003_analytics_UNIT_TEST.md)
> **最終更新**: 2026-05-23

---

## 1. 追加テストケース

### 1.1 `_shared/analytics/scrubber.ts` (新節)

| ID | 入力 | 期待出力 |
|---|---|---|
| UT-AN-SCRUB-01 | `'Invalid email: seiji@example.com'` | `'Invalid email: ***@***'` |
| UT-AN-SCRUB-02 | `'lat=35.6812 lng=139.7671'` | `'lat=<coord> lng=<coord>'` |
| UT-AN-SCRUB-03 | `'cus_abc123XYZ failed'` | `'<stripe_id> failed'` |
| UT-AN-SCRUB-04 | `'pi_xyz789 declined'` | `'<stripe_id> declined'` |
| UT-AN-SCRUB-05 | `'sess_2abcDEF-123 expired'` | `'<clerk_session> expired'` |
| UT-AN-SCRUB-06 | `'user_abcDEF123 created'` | `'<clerk_uid> created'` |
| UT-AN-SCRUB-07 | `'4242-4242-4242-4242 declined'` | `'<card> declined'` |
| UT-AN-SCRUB-08 | `'contact 03-1234-5678'` | `'contact <phone-jp>'` |
| UT-AN-SCRUB-09 | `null` | `null` (素通し) |
| UT-AN-SCRUB-10 | `undefined` | `undefined` (素通し) |
| UT-AN-SCRUB-11 | `42` (number) | `42` (素通し) |
| UT-AN-SCRUB-12 | `{ user: { email: 'x@y.com' }, msgs: ['contact 03-1234-5678'] }` (nested) | `{ user: { email: '***@***' }, msgs: ['contact <phone-jp>'] }` |
| UT-AN-SCRUB-13 | `['a@b.com', 'c@d.com']` (array) | `['***@***', '***@***']` |
| UT-AN-SCRUB-14 | `'mixed: x@y.com lat=35.6812 cus_abc'` (複数パターン同時) | `'mixed: ***@*** lat=<coord> <stripe_id>'` |
| UT-AN-SCRUB-15 | 5KB string with many PII embedded | < 5ms 処理時間 (NFR §5.1) |

### 1.2 `_shared/analytics/sentry.ts` (新節、既存 §1.1 への増分)

| ID | シナリオ | 期待 |
|---|---|---|
| UT-AN-SENTRY-01 | `analytics_opt_in=false` で initSentry 呼出 | `Sentry.init` が呼ばれない (mock 確認) |
| UT-AN-SENTRY-02 | `analytics_opt_in=true` で initSentry 呼出 | `Sentry.init` が呼ばれ、引数に `beforeSend` `beforeBreadcrumb` `initialScope` が含まれる |
| UT-AN-SENTRY-03 | `captureException(new Error('email: a@b.com'))` | beforeSend 後の event.exception.values[0].value が `'email: ***@***'` |
| UT-AN-SENTRY-04 | `addBreadcrumb({ message: 'user_abc登録' })` | beforeBreadcrumb 後の crumb.message が `'<clerk_uid>登録'` |
| UT-AN-SENTRY-05 | initialScope.user.id が SHA-256 hash 化されている (raw Clerk uid ではない) | hash 確認、`user_*` パターン非合致 |

### 1.3 `api/check-quota.ts`, `api/export-revenue.ts` (新節)

| ID | シナリオ | 期待 |
|---|---|---|
| UT-AN-CHECKQUOTA-PII-01 | 通知文 `'User x@y.com over 80%'` を組み立てて Slack mock に POST | mock 受信 body が `'User ***@*** over 80%'` |
| UT-AN-CHECKQUOTA-PII-02 | 集計サマリ通知 `'5 users over 80%, total cost $12.50'` | mock 受信 body そのまま (PII なし) |
| UT-AN-EXPORTREV-PII-01 | 月次収益 CSV パスを通知文に含めて Slack mock に POST | mock 受信 body にパス含む、PII なし |

## 2. 修正テストケース

| ID | 対象 | 修正前 | 修正後 | 理由 |
|---|---|---|---|---|
| (既存 §1 全件) | (なし、既存テスト全維持) | — | — | beforeSend は既存テストに影響しない (mock Sentry で event 検証する新規テストを追加するのみ) |

## 3. 削除テストケース

なし。

## 4. リグレッション強化

- **既存テスト維持**: 既存 UT-AN-001〜N (cost.ts / unit-prices.ts) は全件継承
- **追加チェック**: `Sentry.init` の引数に `beforeSend` が含まれているか (initSentry の最初の test)
- **追加チェック**: `captureException` が直接 `Sentry.captureException` を呼ばず、scrub 経由になっているか (mock spy で確認)

## 5. Mock 方針差分

| 対象 | 前回 | 今回 | 理由 |
|---|---|---|---|
| `@sentry/browser` | mock (既存) | (継続) `Sentry.init` `Sentry.captureException` を spy、引数を assert | beforeSend 引数の検証 |
| Web Crypto SubtleCrypto (`crypto.subtle.digest`) | (なし、sha256Hex 既存ならスキップ) | mock or 実呼出 | sha256Hex のテスト |
| Slack Webhook fetch | mock (既存) | (継続) Slack mock server で body 検証 | PII 混入ゼロ確認 |

## 6. カバレッジ目標

| 種別 | 目標 | 根拠 |
|---|---|---|
| 行 (フロント `scrubber.ts`) | **100%** | 新規ファイル、エラー分岐含めて完全カバレッジ必須 (法令対応) |
| 行 (`sentry.ts` の initSentry / captureException) | 95% | beforeSend / opt-out / hash の全分岐 |
| 行 (`check-quota.ts`, `export-revenue.ts` の scrub 統合部分) | 90% | Slack 通知の scrub 経由 |
| 分岐 | 85% | 既存継承 + scrub の nested object 再帰 |

## 7. 実行環境

- vitest (フロント + Vercel Function、Node 20)
- Sentry 実呼出は手動 smoke test のみ (CI mock、α 公開前に 1 件実 Sentry に投げて event 目視確認)
- Slack 実呼出は手動 smoke test のみ (CI mock)

## 8. 更新履歴

| 日付 | 変更概要 | 実行者 |
|---|---|---|
| 2026-05-23 | 初版作成 (`/flow:revise _shared/analytics --resume sec_004_sentry_pii_scrub`) | /flow:revise |

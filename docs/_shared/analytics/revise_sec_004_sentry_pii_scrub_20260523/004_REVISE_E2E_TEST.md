# _shared/analytics E2E テスト計画 (Sentry beforeSend PII スクラブ実装)

> **入力**: [./001_REVISE_SPEC.md](./001_REVISE_SPEC.md), [../../../concept.md](../../../concept.md) §1.1 / §9.1, [../001_analytics_SPEC.md](../001_analytics_SPEC.md)
> **最終更新**: 2026-05-23

> _shared/analytics 自体は横断モジュールで独立 UC を持たない。本 E2E は `capture` / `billing` / `account` の既存 E2E に組み込む + mock Sentry server を用意する。

---

## 1. 変更 UC シナリオ

### UC1: Sentry 送信前 PII スクラブ (新規)

| シナリオ ID | 前提 | 操作ステップ | 期待結果 |
|---|---|---|---|
| E2E-AN-PII-01 | opt-in user、mock Sentry server 起動 | アプリ内でエラー発生 `Error("Invalid email: seiji@example.com")` | mock Sentry 受信 event の `exception.values[0].value` が `'Invalid email: ***@***'`、`seiji@example.com` 文字列が一切含まれない |
| E2E-AN-PII-02 | opt-in user | アプリ内でエラー発生 (位置情報を含む context) `captureException(err, { lat: 35.6812, lng: 139.7671 })` | mock Sentry 受信 event の `extra.lat` `extra.lng` が `'<coord>'` 化 |
| E2E-AN-PII-03 | opt-in user | breadcrumb に `'user_abc123登録'` を add | mock Sentry 受信 event の breadcrumbs[0].message が `'<clerk_uid>登録'` |
| E2E-AN-PII-04 | opt-in user | initialScope.user.id が raw Clerk uid (例: `user_abc123`) で渡される | mock Sentry 受信 event の user.id が SHA-256 hash 値 (`/^[a-f0-9]{64}$/`)、`user_` プレフィックスなし |
| E2E-AN-PII-05 | opt-out user (`analytics_opt_in=false`) | アプリ内でエラー発生 → `captureException` 呼出 | mock Sentry server で event 受信ゼロ (Sentry.init が完全 skip) |

### UC2: Slack 通知 PII スクラブ (新規)

| シナリオ ID | 前提 | 操作ステップ | 期待結果 |
|---|---|---|---|
| E2E-AN-SLACK-01 | mock Slack Webhook 起動、Vercel Cron 手動トリガー | `check-quota` が `'User seiji@example.com over quota'` を組み立てて POST | mock Slack 受信 body が `'User ***@*** over quota'` |
| E2E-AN-SLACK-02 | mock Slack Webhook 起動 | `export-revenue` が月次 CSV パスを通知 | mock Slack 受信 body に PII なし (パス + 集計サマリのみ) |

## 2. リグレッションシナリオ (既存 UC、重要度高)

| UC | シナリオ ID | 確認観点 |
|---|---|---|
| capture/UC1 (エラー監視) | E2E-CAP-ERR-* 既存 | beforeSend 導入後もエラー監視そのものは機能する (event 送信は走る) |
| account/設定 opt-in トグル | E2E-ACC-OPTIN-* 既存 | opt-in トグル ON → Sentry init 実行、OFF → Sentry.close + 残存 breadcrumb クリア |
| billing/UC | E2E-BILL-* 既存 | Stripe Webhook エラー時の Sentry event に customer_id (cus_*) が `<stripe_id>` 化されて含まれる |

## 3. 移行検証シナリオ

なし (実装着手前、データ移行なし)。

## 4. 環境要件差分

| 項目 | 前回 | 今回 | 理由 |
|---|---|---|---|
| Mock Sentry server | 不要 | **必須** (CI で起動、event 受信を assert) | PII 検証 |
| Mock Slack Webhook | 既存 (cost.ts テストで利用) | 継続利用 | 通知 PII 検証 |
| `SENTRY_DSN` | 不要 | mock server URL (CI) / 実 dev DSN (preview deploy) | E2E-AN-PII-* 実行 |

## 5. 期待 KPI

| 指標 | 目標 |
|---|---|
| `E2E-AN-PII-01〜05` 全件 pass | PII 検出率 100% (法令必須) |
| Sentry event 送信レイテンシ (P95) | scrub 込みで < 50ms (NFR §5.1) |
| 既存 E2E リグレッション | 既存 SLA 維持 (全件 pass) |
| 法務監査用エクスポート機構 | Sentry SDK で過去 90 日 event エクスポート可能 (手動確認) |

## 6. テスト実行戦略

- **PR ごと (critical-path)**: E2E-AN-PII-01 + E2E-AN-PII-04 + E2E-AN-PII-05 (法令対応の最低限)
- **nightly (フル E2E)**: 全シナリオ + リグレッション
- **mock Sentry**: CI ローカルでは Node http server を立てて event を捕捉、Vercel preview deploy では実 dev Sentry に投げて手動目視
- **α 公開直前 manual smoke test**: 実 Sentry 本番接続で 1 件投げて、event を Sentry UI で目視 → PII 混入ゼロを seiji + (可能なら) 法務知見ある人が確認

## 7. 法務監査用シナリオ (新規追加カテゴリ)

| シナリオ ID | 前提 | 操作 | 期待 |
|---|---|---|---|
| E2E-AN-AUDIT-01 | 開示請求を想定 | Sentry SDK 経由で特定 user (hash uid) の過去 90 日 event を export | エクスポート成功、CSV/JSON 形式で出力可能 |
| E2E-AN-AUDIT-02 | プラポリ §9.1 整合性 | 実装した PII カテゴリ (7 種) がプラポリ記載と一致 | 法務レビュー pass |

> §7 は α 公開前に 1 度実行する手動テスト。CI 自動化対象外。

## 8. 更新履歴

| 日付 | 変更概要 | 実行者 |
|---|---|---|
| 2026-05-23 | 初版作成 (`/flow:revise _shared/analytics --resume sec_004_sentry_pii_scrub`) | /flow:revise |

# _shared/analytics 実装計画書

> **入力**: `./001_analytics_SPEC.md`, `../db/001_db_SPEC.md`
> **最終更新**: 2026-05-22

---

## 1. 実装対象ファイル一覧

### 1.1 アプリ層 (`src/shared/analytics/`)
| ファイル | 責務 | 依存 | LOC |
|---|---|---|---|
| `sentry.ts` | Sentry init + キャプチャラッパ | @sentry/browser, @sentry/react | ~60 |
| `cost.ts` | api_usage INSERT + 概算コスト計算 + マテビュー読み取り | _shared/db, _shared/types | ~80 |
| `unit-prices.ts` | .env 単価を型付きで提供 | (なし) | ~30 |
| `index.ts` | barrel | 全 above | ~10 |

### 1.2 Edge Function (`supabase/functions/check-quota/`)
| ファイル | 責務 | LOC |
|---|---|---|
| `index.ts` | 日次集計 + 閾値判定 + Slack Webhook 送信 | ~80 |

### 1.3 マイグレーション補完 (`supabase/migrations/`)
| ファイル | 責務 | LOC |
|---|---|---|
| `20260522_015_pg_cron_quota.sql` | check-quota Edge Function を pg_cron で日次実行 | ~20 |
| `20260522_016_pg_cron_matview_refresh.sql` | api_usage_monthly を日次 refresh | ~10 |

## 2. 実装 Phase 分割

### Phase 1: cost.ts + unit-prices.ts
- 最重要 (`_shared/ai` の前提)
- ゴール: logApiUsage が api_usage に INSERT、getMonthlyUsage がマテビュー読み取り、estimateCost が単価 × トークン

### Phase 2: sentry.ts
- 依存: user_settings.analytics_opt_in 取得
- ゴール: opt-in user のエラーが Sentry に届く、opt-out user は送信されない

### Phase 3: check-quota Edge Function + pg_cron
- 日次バッチ + アラート
- ゴール: 閾値超過で Slack に通知が来る、超過してないと通知なし

## 3. 依存関係順序

```mermaid
graph TD
  DB[_shared/db (api_usage)] --> COST[cost.ts]
  TY[_shared/types/analytics] --> COST
  ENV[.env 単価] --> UP[unit-prices.ts] --> COST
  US[user_settings.analytics_opt_in] --> SENT[sentry.ts]
  COST --> EF[check-quota Edge Function]
  EF --> SW[Slack Webhook]
```

## 4. 既存ファイル影響
- `.env.example` に COST_* + SLACK_QUOTA_WEBHOOK_URL を追加
- `supabase/config.toml` に Edge Function `check-quota` 登録

## 5. 横断フォルダ追加・変更
| 横断フォルダ | 追加・変更内容 |
|---|---|
| `_shared/types/analytics.ts` | CostLogEntry, UsageSummary 型を追加 |
| `_shared/db/` | (なし、本 module からスキーマ変更不要) |

## 6. リスク・注意点
- **fail-soft 必須**: logApiUsage 失敗で UI ブロックしない (try-catch で握り潰し + console.error)
- **Slack Webhook URL リーク**: .env 平文管理だが、リポジトリにコミットしない (`.env.local` 専用)、漏洩時は Slack で revoke して再発行
- **Sentry user_id**: hash 化必須、生 uid を送らない (個情法対応)
- **マテビュー stale**: 日次 refresh のため当日分は反映遅延あり → リアルタイム集計が要るなら別途 (現状 MVP は許容)
- **pg_cron extension**: Supabase Free でも利用可だが有効化要 (マイグレーション 001 で対応済)

## 7. DoD
- [ ] cost.ts 全関数 vitest pass
- [ ] sentry.ts opt-in/out 切替動作確認
- [ ] check-quota Edge Function を手動実行 → Slack に届く
- [ ] pg_cron で日次実行確認 (24h 待機 or 短縮設定でテスト)

## 8. 更新履歴
| 日付 | 変更概要 | 実行者 |
|---|---|---|
| 2026-05-22 | 初版作成 | /flow:feature |

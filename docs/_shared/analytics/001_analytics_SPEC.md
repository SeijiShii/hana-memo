# _shared/analytics 仕様書

> **役割**: 計測基盤 (Sentry エラー監視 + 自前 API コストログ + 無料枠超過アラート)
> **タグ**: cross-cutting / analytics / auth-required (opt-in)
> **最終更新**: 2026-05-22 (BaaS Pivot 反映)
> **入力アーティファクト**: `../../concept.md` §4.6.2-§4.6.6, `../db/001_db_SPEC.md`

---

## 1. 提供インターフェース

### 1.1 Sentry エラー監視 (`src/shared/analytics/sentry.ts`)
| 関数 | シグネチャ | 説明 |
|---|---|---|
| `initSentry` | `(user: User, opts: {dsn: string}) => void` | analytics_opt_in=true の user のみ init、Clerk user id を SHA-256 hash 化 |
| `captureException` | `(err: Error, context?: object) => void` | 例外送信 (opt-in user のみ) |
| `captureMessage` | `(msg: string, level?: 'info'|'warning'|'error') => void` | |

### 1.2 コストログ (`src/shared/analytics/cost.ts`)
| 関数 | シグネチャ | 説明 |
|---|---|---|
| `logApiUsage` | `(entry: CostLogEntry) => Promise<void>` | api_usage に Drizzle で INSERT、副作用のみ |
| `getMonthlyUsage` | `(userId: string, yearMonth: string) => Promise<UsageSummary>` | api_usage_monthly matview から取得 |
| `estimateCost` | `(entry: CostLogEntry) => number` | .env 単価で USD 概算、表示用 |
| `refreshMonthlyMatview` | `() => Promise<void>` | Vercel Cron Function `/api/refresh-matview` から呼ばれる |

### 1.3 無料枠アラート (`api/check-quota.ts` Vercel Cron)
| 機能 | 動作 |
|---|---|
| Vercel Cron (日次) | 各無料枠 (OpenAI 月予算 / R2 ストレージ / Neon DB+コンピュート / Clerk MAU / Vercel 帯域) を集計 → 閾値 (80%/100%/120%) 超過時に Slack Webhook 通知 |

## 2. 入出力

### 2.1 API
- 内部関数のみ (外部 API なし、Sentry / Slack Webhook は外部送信)

### 2.2 副作用
- DB 書込: api_usage (Drizzle INSERT)
- 外部送信: Sentry (opt-in user のエラー) / Slack Webhook (閾値超過アラート)

## 3. データモデル
新規定義なし。`_shared/types/analytics.ts` の `CostLogEntry` / `UsageSummary`、`_shared/db` の `api_usage` テーブル + `api_usage_monthly` matview に依存。

## 4. バリデーション・エラー

### 4.1 入力チェック
| 関数 | チェック | 失敗時 |
|---|---|---|
| logApiUsage | service, endpoint 非空 / tokens >= 0 | reject |
| initSentry | dsn 形式 | console.warn + 初期化スキップ |
| estimateCost | .env 単価 defined | NaN 返却 + console.warn |

### 4.2 エラーケース
| ID | 条件 | 対応 |
|---|---|---|
| E-AN-001 | api_usage INSERT 失敗 (DB / network) | retry 1 → fail 時 console.error、本処理継続 (fail-soft) |
| E-AN-002 | Sentry 送信失敗 | silent fail |
| E-AN-003 | Slack Webhook URL 未設定 | 警告 log + アラートスキップ |
| E-AN-004 | matview refresh 中の SELECT | stale data 許容 (concurrent refresh は MVP しない) |

## 5. NFR + 既存連携

### 5.1 NFR
| 項目 | 目標値 | 根拠 |
|---|---|---|
| logApiUsage overhead | < 50ms (非同期、本処理ブロックせず) | UX |
| matview refresh | < 30s / 日次 | concept §5.1 NFR |
| アラート発火遅延 | < 24h (日次バッチ) | 月予算超過検知に十分 |
| Sentry 送信 | エラー 1 件以上で必ず送信 (opt-in user) | 信頼性 |

### 5.2 既存連携
| 連携先 | 種別 | 依存内容 |
|---|---|---|
| `_shared/db` | Drizzle | api_usage / api_usage_monthly / user_settings.analytics_opt_in |
| `_shared/ai` | logApiUsage 呼出 | OpenAI Vision call 後に必ず logApiUsage |
| `billing` | getMonthlyUsage 参照 | ユーザー画面で「今月 N 回使用 / 10 回無料枠」表示 |
| `account` | initSentry トリガ | analytics_opt_in トグル時 |

## 6. タグ別追加

### 6.1 認可 (auth-required)
- initSentry は Clerk user + user_settings.analytics_opt_in=true 確認後に呼ぶ
- 匿名 user は OFF デフォルト維持 (個情法対応)
- Clerk user id は SHA-256 hash 化して Sentry に送信

### 6.2 分析 (analytics)
- Sentry イベント: 自動 (Sentry SDK 自動収集) + 手動 captureException
- 自前イベント: api_usage INSERT のみ (MVP 最小)

## 7. スコープ外
- ユーザー行動分析 (PostHog / GA4) → [論点-005] α 後判断
- リアルタイムダッシュボード → Drizzle Studio で直接 SQL 代替
- 課金成功率分析 → `billing` 側

## 8. 未決事項
> 現時点で論点なし
>
> 関連: [論点-005] 利用分析ツール導入時期

## 9. 更新履歴
| 日付 | 変更概要 | 実行者 |
|---|---|---|
| 2026-05-22 | 初版作成 (Supabase 前提) | /flow:feature |
| 2026-05-22 | BaaS Pivot: Drizzle + Vercel Cron Functions に書換 | /flow:concept (UPDATE) |

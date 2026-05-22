# _shared/analytics 単体テスト計画

> **入力**: `./001_analytics_SPEC.md`, `./002_analytics_PLAN.md`
> **最終更新**: 2026-05-22

---

## 1. テストケース

### 1.1 cost.ts
| ID | 関数 | 入力 | 期待出力 |
|---|---|---|---|
| UT-AN-C01 | logApiUsage 正常 | CostLogEntry | api_usage に row 1 件追加 |
| UT-AN-C02 | logApiUsage INSERT 失敗 → fail-soft | mock supabase INSERT err | resolve、console.error 1 回 |
| UT-AN-C03 | estimateCost gpt-4o-mini | input=1000, output=500, image=1 | (1*0.00015 + 0.5*0.0006 + 1*0.001) ≒ 0.00145 USD |
| UT-AN-C04 | estimateCost 単価未定義 | service=未登録 | NaN + console.warn |
| UT-AN-C05 | getMonthlyUsage マテビュー | mock マテビュー row | UsageSummary 構造で返却 |
| UT-AN-C06 | refreshMonthlyMatview 成功 | service_role client | resolve |

### 1.2 sentry.ts
| ID | 関数 | 入力 | 期待出力 |
|---|---|---|---|
| UT-AN-S01 | initSentry opt-in user | analytics_opt_in=true | Sentry.init() 呼出 1 回 |
| UT-AN-S02 | initSentry opt-out user | analytics_opt_in=false | Sentry.init() 呼出 0 回 |
| UT-AN-S03 | initSentry user_id hash | user.id = 'abc-123' | Sentry.setUser({id: sha256('abc-123')}) |
| UT-AN-S04 | captureException opt-out | (opt-out 状態) | Sentry.captureException 呼出なし |
| UT-AN-S05 | captureException opt-in | (opt-in 状態) | 呼出 1 回 |

### 1.3 check-quota Edge Function
| ID | シナリオ | 入力 (mock) | 期待挙動 |
|---|---|---|---|
| UT-AN-Q01 | 80% 超過 | OpenAI 月予算 $30 → 当月 $24 | Slack に WARNING 通知 |
| UT-AN-Q02 | 100% 超過 | $30 → $30 | Slack に CRITICAL 通知 |
| UT-AN-Q03 | 120% 超過 | $30 → $36 | Slack に EMERGENCY 通知 |
| UT-AN-Q04 | 閾値以下 | $30 → $10 | 通知なし |
| UT-AN-Q05 | Storage 無料枠超過 | Storage 1.2GB / 1GB | Slack 通知 |
| UT-AN-Q06 | Webhook URL 未設定 | env 未設定 | console.warn + スキップ |

### 1.4 異常系・境界
| ID | 対象 | 条件 | 期待 |
|---|---|---|---|
| UT-AN-E01 | logApiUsage RLS 拒否 | 他 user の user_id で INSERT | reject → console.error、本処理継続 |
| UT-AN-E02 | estimateCost ゼロ | input=0, output=0, image=0 | 0 USD |
| UT-AN-B01 | logApiUsage 高頻度 (100 req/s) | 100 並列 | 全 INSERT 成功、DB lock 起きない |

## 2. Mock 方針

| 対象 | 方針 | 理由 |
|---|---|---|
| Supabase client | モック (vitest mock) | スキーマ + RLS は `_shared/db` UNIT でカバー済 |
| Sentry SDK | モック (`vi.mock('@sentry/browser')`) | 外部呼出回避 |
| .env 単価 | テスト前 `vi.stubEnv` で固定値設定 | 値変動で test fragile 化防止 |
| crypto.subtle (hashIp 内部) | Node ネイティブ使用 | テスト環境差なし |
| Slack Webhook | fetch mock | 外部送信回避 |
| マテビュー | Supabase client mock の resolved value | RLS / 集計は `_shared/db` でカバー |

## 3. カバレッジ目標
| 種別 | 目標 | 根拠 |
|---|---|---|
| 行カバレッジ | 85% | アプリ層は標準 |
| 分岐カバレッジ | 75% | fail-soft 分岐含む |
| Edge Function | 80% | Slack 配信ロジック検証 |

## 4. テスト実行環境
- vitest (アプリ層) + Deno test (Edge Function) — concept §4.5 に整合
- CI 並列実行可

## 5. 更新履歴
| 日付 | 変更概要 | 実行者 |
|---|---|---|
| 2026-05-22 | 初版作成 | /flow:feature |

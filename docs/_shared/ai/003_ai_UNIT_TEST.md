# _shared/ai 単体テスト計画

> **入力**: `./001_ai_SPEC.md`, `./002_ai_PLAN.md`
> **最終更新**: 2026-05-22

---

## 1. テストケース

### 1.1 フロント側 identify.ts
| ID | シナリオ | 期待 |
|---|---|---|
| UT-AI-F01 | identifyPlant 正常 | IdentifyResult 返却 |
| UT-AI-F02 | quota 402 | throw QuotaExceededError |
| UT-AI-F03 | 401 link_required | throw LinkRequiredError |
| UT-AI-F04 | 5xx | throw AiServiceError |
| UT-AI-F05 | timeout (network) | throw AiServiceError + console.error |
| UT-AI-F06 | retryIdentify pending discovery | identifyPlant と同じ payload で再呼出 |

### 1.2 Edge Function: index.ts handler
| ID | シナリオ | 期待 |
|---|---|---|
| UT-AI-H01 | 認証なし | 401 |
| UT-AI-H02 | JWT 無効 | 401 |
| UT-AI-H03 | quota 0 + 匿名 | 401 link_required |
| UT-AI-H04 | quota 0 + OAuth user | 402 quota_exceeded |
| UT-AI-H05 | 正常 flow | 200 IdentifyResult + discoveries update + api_usage INSERT |
| UT-AI-H06 | OpenAI 500 | retry → pending discovery + 200 with status=pending |
| UT-AI-H07 | OpenAI rate limit 429 | 5s wait + retry 2 回 |
| UT-AI-H08 | 構造化出力不適合 | discovery=pending + Sentry warn |
| UT-AI-H09 | image_url が他 user の storage path | 400 |

### 1.3 prompt.ts: buildPrompt
| ID | 入力 | 期待出力 |
|---|---|---|
| UT-AI-P01 | full input | system + user (画像 + 全メタ) |
| UT-AI-P02 | location なし | user message に位置行なし |
| UT-AI-P03 | userNote なし | user message に補助メモ行なし |
| UT-AI-P04 | season=winter | 「冬」と日本語化 |
| UT-AI-P05 | location lat=35.681,lng=139.767 | "緯度 35.681, 経度 139.767" 文字列 |

### 1.4 schema.ts: parseStructuredOutput
| ID | 入力 | 期待 |
|---|---|---|
| UT-AI-S01 | 正常 JSON | IdentifyResult 返却 |
| UT-AI-S02 | 必須フィールド欠落 | throw SchemaValidationError |
| UT-AI-S03 | confidence < 0.6 | status='pending' |
| UT-AI-S04 | confidence >= 0.6 | status='identified' |
| UT-AI-S05 | confidence=0 | status='unknown' |
| UT-AI-S06 | similar_species > 3 | reject |

### 1.5 openai-client.ts: retry
| ID | シナリオ | 期待 |
|---|---|---|
| UT-AI-O01 | 1 回成功 | retry なし |
| UT-AI-O02 | 1 回 500 → 2 回目成功 | retry 1 回 + 1s wait |
| UT-AI-O03 | 3 連続失敗 | throw AfterRetryError |
| UT-AI-O04 | 429 → 5s wait → 成功 | wait 確認 |
| UT-AI-O05 | API key 不正 | 401 即 throw (no retry) |

### 1.6 quota.ts
| ID | シナリオ | 期待 |
|---|---|---|
| UT-AI-Q01 | checkQuota 残あり | {ok:true, remaining:N} |
| UT-AI-Q02 | checkQuota 残 0 | {ok:false} |
| UT-AI-Q03 | consumeQuota 正常 | counter -1 |
| UT-AI-Q04 | consumeQuota 0 から | reject |

### 1.7 異常系・境界
| ID | 対象 | 条件 | 期待 |
|---|---|---|---|
| UT-AI-E01 | OpenAI response が空 string | parseStructuredOutput | reject |
| UT-AI-E02 | 並列 100 リクエスト | quota race | 全体で適切に reject される (over-allocation なし) |
| UT-AI-B01 | 巨大画像 (5MB ぎりぎり) | upload + identify | 成功 |

## 2. Mock 方針
| 対象 | 方針 | 理由 |
|---|---|---|
| OpenAI SDK | mock | 本番 API コスト回避 |
| Supabase client | mock | DB 副作用回避 |
| fetch (image url) | mock | 外部呼出回避 |
| Date.now | useFakeTimers | retry backoff 検証 |

## 3. カバレッジ目標
| 種別 | 目標 |
|---|---|
| 行 (フロント) | 85% |
| 行 (Edge Function) | 90% |
| 分岐 | 80% |

## 4. 実行環境
- vitest (フロント) + Deno test (Edge Function)
- OpenAI 実呼出は手動 smoke test のみ (capture E2E でも 1 件)

## 5. 更新履歴
| 日付 | 変更概要 | 実行者 |
|---|---|---|
| 2026-05-22 | 初版作成 | /flow:feature |

# _shared/ai 実装計画書

> **入力**: `./001_ai_SPEC.md`, `../analytics/001_analytics_SPEC.md`, `../storage/001_storage_SPEC.md`
> **最終更新**: 2026-05-22 (BaaS Pivot)

---

## 1. 実装対象ファイル一覧

### 1.1 アプリ層 (`src/shared/ai/`)
| ファイル | 責務 | 依存 | LOC |
|---|---|---|---|
| `identify.ts` | identifyPlant / retryIdentify (Vercel Function 呼出 with Clerk JWT) | @clerk/clerk-react | ~80 |
| `errors.ts` | QuotaExceededError, LinkRequiredError (re-export), AiServiceError | (なし) | ~30 |
| `index.ts` | barrel | 全 above | ~10 |

### 1.2 Vercel Function (`api/`)
| ファイル | 責務 | LOC |
|---|---|---|
| `identify-plant.ts` | HTTP handler (auth / quota / R2 presign / openai / db / cost log) | @clerk/backend, drizzle, @aws-sdk/s3-request-presigner, openai | ~250 |
| `_lib/prompt.ts` | buildPrompt(input) | (なし) | ~80 |
| `_lib/schema.ts` | StructuredOutput JSON Schema | (なし) | ~50 |
| `_lib/openai.ts` | OpenAI SDK ラッパ + retry | openai | ~80 |
| `_lib/quota.ts` | checkQuota / consumeQuota (Drizzle 操作) | drizzle | ~60 |

### 1.3 マイグレーション
- 新規なし (discoveries / api_usage / users は `_shared/db` で定義済)

## 2. 実装 Phase 分割

### Phase 1: Vercel Function スケルトン
- ゴール: Clerk JWT 検証 + dummy response 返す
- 含む: identify-plant.ts (skeleton), CORS 設定, runtime=nodejs

### Phase 2: OpenAI 連携 + R2 presign
- ゴール: 実 API 呼出で IdentifyResult 取得
- 含む: openai.ts, prompt.ts, schema.ts, retry、R2 presigned GET URL 発行

### Phase 3: quota + cost log
- ゴール: 呼出前 quota チェック、呼出後 api_usage INSERT
- 含む: quota.ts, _shared/analytics/cost との連携

### Phase 4: フロント側 identifyPlant
- ゴール: capture から呼出可能
- 含む: src/shared/ai/identify.ts

## 3. 依存関係順序

```mermaid
graph TD
  Auth[_shared/auth Clerk JWT] --> EF[/api/identify-plant]
  Storage[_shared/storage R2 presigned GET] --> EF
  EF --> OAI[OpenAI API]
  EF --> DB[(discoveries via Drizzle)]
  EF --> AU[(api_usage via Drizzle)]
  Analytics[_shared/analytics cost.ts] --> EF
  EF --> FE[src/shared/ai/identify.ts]
  FE --> Capture[capture feature]
```

## 4. 既存ファイル影響
- `vercel.json`: function path `/api/identify-plant` を Node 20 runtime に明示
- `.env`: `OPENAI_API_KEY` (Vercel env、Function only)
- `package.json`: `openai` (Vercel Function only)

## 5. 横断フォルダ追加・変更
| 横断 | 内容 |
|---|---|
| `_shared/types/ai.ts` | IdentifyInput, IdentifyResult (本 SPEC で定義) |
| `_shared/db/001_db_SPEC.md` の discoveries | status enum + confidence カラム (既存設計) を再確認 |

## 6. リスク・注意点
- **OPENAI_API_KEY 漏洩**: Vercel env immediate revoke、Sentry で env リーク監視
- **OpenAI レート制限**: tier 1 で TPM 制限あり、Function 並列実行で枯渇可能性 → 429 retry + バックオフ
- **Structured Output サポート**: gpt-4o-mini-2024-07-18 以降必須
- **画像 URL**: R2 presigned GET URL を Function 内で短期 TTL 発行 (15 分等)、OpenAI 側で読み込み完了するまで有効
- **Vercel Function 10s timeout**: OpenAI が遅延で timeout → retry 含めて 8s 以内に収まる設計
- **コスト爆発**: 月 $30 予算 → 1 回 $0.003 として 10,000 回。匿名 SPAM 抑止が効かないと 1 日で枯渇可能性
- **構造化出力エラー (E-AI-003)**: gpt が schema を満たさないと pending + Sentry warn
- **discovery status='pending'**: 「30 分以内に自動再試行 + 手動再試行可」設計、自動 cron (Vercel Cron) は将来実装

## 7. DoD
- [ ] capture から identifyPlant 呼出で 5 秒以内に IdentifyResult が返る
- [ ] quota 0 で 402 + UI が課金画面に遷移
- [ ] 匿名 trial 超過で 401 + UI が OAuth 画面に遷移
- [ ] OpenAI 5xx で 3 回 retry → 最終 pending
- [ ] discoveries.status, confidence, scientific_name 等が Drizzle update で正しく更新
- [ ] api_usage INSERT で cost が記録される
- [ ] Function key が response/log に絶対に出ない
- [ ] vitest (frontend) + Vitest/Node (Function) pass

## 8. 更新履歴
| 日付 | 変更概要 | 実行者 |
|---|---|---|
| 2026-05-22 | 初版作成 (Supabase Edge Fn 前提) | /flow:feature |
| 2026-05-22 | BaaS Pivot: Vercel Function + Drizzle + R2 presigned GET (D20260522-116) | /flow:concept (UPDATE) |

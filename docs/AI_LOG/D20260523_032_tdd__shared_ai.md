# D20260523_032 — /flow:tdd _shared/ai (SDK 非依存コア + SEC-001/003 fold-in)

```yaml
session_id: D20260523_032_tdd__shared_ai
command: /flow:tdd
mode: feature (SDK 非依存コア) + SEC-001 (rate limit) / SEC-003 (SSRF) fold-in
target: _shared/ai
started_at: 2026-05-23T17:56:00+09:00
last_updated: 2026-05-23T17:58:00+09:00
状態: 完了 (SDK 非依存コア)
完了ステップ一覧: [Step 1-4 判定, Step 5 実装, Step 6 全テスト, Step 7 レポート, Step 9 INDEX, Step 10 整合性, Step Z commit]
依存セッション: [D20260522_009_feature__shared_ai, D20260523_022_revise__shared_ai_sec_001-003, D20260523_031_tdd__shared_storage]
dispatched_by: /flow:auto (continuous loop iteration 4)
```

---

## Step 1-4: スコープ + 軽重判定

`_shared/ai` は OpenAI Vision (Vercel Function) ラッパ。decouple 方針に従い **SDK 非依存のテスト可能コアのみ実装**:

### 実装 (今回、純ロジック + DI)
| ファイル | 責務 | 対応テスト |
|---|---|---|
| `errors.ts` | QuotaExceededError / AiServiceError / SchemaValidationError / AfterRetryError / RateLimitedError | |
| `prompt.ts` | buildIdentifyPrompt (system + user、季節 JP / 位置 / メモ 条件) | UT-AI-P01〜P05 |
| `schema.ts` | IDENTIFY_SCHEMA + parseIdentifyResponse (snake→camel + confidence→status 導出) | UT-AI-S01〜S06, E01 |
| `quota.ts` | checkQuota / consumeQuota | UT-AI-Q01〜Q04 |
| `rate-limit.ts` | RateLimiter (DI) + checkIdentifyRateLimit ([SEC-001] 10/min) | (新規) |
| `retry.ts` | withRetry (backoff 1s/2s/4s、sleep 注入、isRetryable) | UT-AI-O01〜O05 |
| `index.ts` | barrel | |

- SSRF guard ([SEC-003]) は実装済 `_shared/helpers/url.ts assertSafeImageUrl` / `validateObjectKey` を再利用 (Vercel Function が wiring)。

### Defer (app/api bootstrap、SDK 必要)
- `api/identify-plant.ts` handler (Clerk JWT + Upstash binding + R2 presign + OpenAI 呼出 + Drizzle 書込、UT-AI-H01〜H09)
- `api/_lib/openai.ts` (OpenAI SDK ラッパ)
- frontend `identify.ts` (fetch wrapper、UT-AI-F01〜F06)
- Upstash Ratelimit 実バインディング (rate-limit.ts の RateLimiter 実装)

---

## decisions

### D20260523-095 — Step 1 スコープ (ai decouple + SEC-001/003 fold-in)

- **chosen_type**: auto-recommended (decouple 方針継続)
- **chosen**: prompt/schema/quota/rate-limit/retry/errors コアを実装、OpenAI SDK / Upstash / Vercel handler / frontend は defer。SSRF は実装済 url.ts 再利用
- **context**: ai は OpenAI SDK + Upstash + Vercel Function 結合。テスト可能なドメインロジック (プロンプト構築 / 構造化出力パース / quota / rate limit 判定 / retry backoff) を切り出し

### D20260523-096 — Step 6 全テスト結果

- **chosen_type**: auto-recommended
- **chosen**: 37 tests pass、全体 261/261 pass、typecheck clean
- **context**: ai 行 98.94% / 分岐 93.65% (errors/prompt/quota/rate-limit 100%)。vitest 2.1.9 で `toHaveBeenCalledExactlyOnceWith` 不在 → 分割

---

## 生成・更新アーティファクト
- 実コード: `src/shared/ai/{errors,prompt,schema,quota,rate-limit,retry,index}.ts` (7 新規) + test (4 新規、37 tests)
- レポート: `101_ai_IMPL_REPORT.md` / `102_ai_UNIT_TEST_REPORT.md`
- INDEX: `_shared/ai/INDEX.md` / `docs/INDEX.md` → コア実装完了
- concept §8: [論点-011] SEC-001 rate-limit コア実装完了 (status 維持、Upstash binding 待ち)、[論点-013] SEC-003 SSRF → **closed** (全消費確認)
- SCENARIO §5: Phase 3 = 4 完全 + 3 コア (全 7 _shared 完了)、次 legal / 機能

## 学習・改善
- 全 7 _shared 横断モジュール完了。外部 SDK 依存 4 件 (Sentry/Clerk/R2/OpenAI+Upstash) は全て injectable + DI コアで先行実装、glue を app/api bootstrap に集約する pattern が確立

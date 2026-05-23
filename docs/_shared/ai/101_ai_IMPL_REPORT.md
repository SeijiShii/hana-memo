# 実装レポート: _shared/ai (SDK 非依存コア + SEC-001/003 fold-in)

## 実装日時
2026-05-23 17:58 (JST)

## モード
feature — **SDK 非依存のテスト可能コアのみ実装**。OpenAI SDK / Upstash binding / Vercel Function handler / frontend fetch は app/api bootstrap フェーズへ defer。SEC-001 (rate limit) / SEC-003 (SSRF) を fold-in。

## 関連ドキュメント
- [001_ai_SPEC.md](./001_ai_SPEC.md) / [002_ai_PLAN.md](./002_ai_PLAN.md) / [003_ai_UNIT_TEST.md](./003_ai_UNIT_TEST.md)
- [revise_sec_001-003_rate_limit_ssrf_20260523/](./revise_sec_001-003_rate_limit_ssrf_20260523/) — [SEC-001]/[SEC-003] (本実装で fold-in)
- [902_ai_IMPL_SECURITY_CHECKLIST.md](./902_ai_IMPL_SECURITY_CHECKLIST.md)
- [AI_LOG](../../AI_LOG/D20260523_032_tdd__shared_ai.md)

## 変更一覧

### 実装 (純ロジック + DI)
- `src/shared/ai/errors.ts` (新規): QuotaExceededError / AiServiceError / SchemaValidationError / AfterRetryError / RateLimitedError ([SEC-001] E-AI-007)。
- `src/shared/ai/prompt.ts` (新規): `buildIdentifyPrompt` (system + user、季節 JP / 位置 / メモ 条件付き、純関数)。
- `src/shared/ai/schema.ts` (新規): `IDENTIFY_SCHEMA` + `parseIdentifyResponse` (snake→camel + 必須/型/件数検証) + `deriveStatus` (0=unknown / <0.6=pending / ≥0.6=identified)。
- `src/shared/ai/quota.ts` (新規): `checkQuota` / `consumeQuota`。
- `src/shared/ai/rate-limit.ts` (新規): `RateLimiter` (DI) + `checkIdentifyRateLimit` + `IDENTIFY_RATE_LIMIT` (10/min) ([SEC-001])。
- `src/shared/ai/retry.ts` (新規): `withRetry` (backoff 1s/2s/4s、sleep 注入、isRetryable で non-retryable 即 throw)。
- `src/shared/ai/index.ts` (新規): barrel。

## 実装計画からの差分

| 項目 | 内容 |
|------|------|
| 計画にない追加変更 | rate limit を `RateLimiter` DI、retry を sleep 注入式に切り出し (Upstash / setTimeout を非依存テスト可能化)。 |
| 計画から省略した変更 | **defer (app/api bootstrap)**: `api/identify-plant.ts` handler (Clerk JWT + Upstash binding + R2 presign + OpenAI 呼出 + Drizzle 書込、UT-AI-H01〜H09)、`api/_lib/openai.ts` (OpenAI SDK)、frontend `identify.ts` (UT-AI-F01〜F06)。SSRF guard ([SEC-003]) は実装済 `helpers/url.ts assertSafeImageUrl`/`validateObjectKey` を再利用。 |
| 想定外の問題と対処 | vitest 2.1.9 に `toHaveBeenCalledExactlyOnceWith` が無く `toHaveBeenCalledTimes`+`toHaveBeenCalledWith` に分割。`parseIdentifyResponse` は string/object 両対応 (OpenAI が JSON 文字列を返すケース)。 |

## PR Description

### タイトル
_shared/ai: SDK 非依存コア (prompt + structured output + quota + rate limit + retry)

### 概要
OpenAI Vision クライアントのうち SDK 非依存のドメインロジック (プロンプト構築、構造化出力パース + status 導出、quota、[SEC-001] レート制限判定、exponential backoff retry) を実装。OpenAI SDK / Upstash / Vercel handler の実 wiring は app/api bootstrap フェーズへ。

### テスト
- 37 tests pass、ai 行 98.94% / 分岐 93.65% (errors/prompt/quota/rate-limit 100%)
- 全体 261/261 pass、typecheck clean

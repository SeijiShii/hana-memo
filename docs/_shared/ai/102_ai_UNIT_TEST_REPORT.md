# 単体テストレポート: _shared/ai (SDK 非依存コア)

## 実施日時
2026-05-23 17:58 (JST)

## 関連ドキュメント
- [003_ai_UNIT_TEST.md](./003_ai_UNIT_TEST.md) + [revise.../003_REVISE_UNIT_TEST.md](./revise_sec_001-003_rate_limit_ssrf_20260523/003_REVISE_UNIT_TEST.md)

## テスト実行環境
- Node 20 / Vitest 2.1.9 (`environment: node`)

## テスト結果

| # | テストケース | テストファイル | 結果 |
|---|------------|-------------|------|
| UT-AI-P01〜P05 | buildIdentifyPrompt full/位置なし/メモなし/winter/位置フォーマット | prompt.test.ts | ✅ |
| UT-AI-S01〜S06 | parseIdentifyResponse 正常/欠落/confidence→status/similar>3 | schema.test.ts | ✅ |
| UT-AI-E01 | 空 string → SchemaValidationError | schema.test.ts | ✅ |
| (追加) | key_features 範囲 / confidence 範囲外 / 不正 JSON / 非オブジェクト / similar 要素非オブジェクト / deriveStatus 境界 | schema.test.ts | ✅ |
| UT-AI-Q01〜Q04 | checkQuota 残あり/0 + consumeQuota 正常/0 | runtime.test.ts | ✅ |
| (SEC-001) | checkIdentifyRateLimit success/失敗 + key + 定数 | runtime.test.ts | ✅ |
| UT-AI-O01〜O05 | withRetry 成功/1retry/全失敗/429 5s/non-retryable | runtime.test.ts | ✅ |
| (追加) | retry デフォルト sleep (実 setTimeout) | runtime.test.ts | ✅ |
| (契約) | errors 5 種 instanceof + プロパティ | errors.test.ts | ✅ |

## 追加テストケース

| # | 対象 | 追加理由 |
|---|------|---------|
| A1 | schema 境界 (key_features/confidence/JSON 不正/非object/similar item) | 構造化出力の堅牢性 (E-AI-003) |
| A2 | rate-limit 判定 + key + 定数 | [SEC-001] レート制限コア |
| A3 | retry デフォルト sleep / errors 契約 | カバレッジ補強 |

## サマリー

| 項目 | 値 |
|------|-----|
| 計画テスト数 (本コア該当) | 約 20 件 (P01〜P05 + S01〜S06 + Q01〜Q04 + O01〜O05) |
| 追加テスト数 | 17 件 |
| 合計 | 37 件 |
| 成功 | 37 件 / 失敗 0 件 / 成功率 100% |
| ai 行カバレッジ | 98.94% (目標 85% ↑) |
| ai 分岐カバレッジ | 93.65% (目標 80% ↑) |
| errors/prompt/quota/rate-limit.ts | 行 100% |

## カバレッジ未達・補足
- `index.ts` (barrel) 0%、`retry.ts` 95.45% (default sleep 内部 Promise executor) / `schema.ts` 93.93% (similar item String fallback)。いずれも目標超過。
- **defer (本レポート対象外)**: UT-AI-F01〜F06 (frontend identify.ts)、UT-AI-H01〜H09 (Vercel handler)、UT-AI-O の実 OpenAI smoke。app/api bootstrap フェーズで SDK mock + capture E2E にて実施。

# 単体テストレポート: capture (UI 非依存コア)

## 実施日時
2026-05-23 18:10 (JST)

## 関連ドキュメント
- [003_capture_UNIT_TEST.md](./003_capture_UNIT_TEST.md)

## テスト実行環境
- Node 20 / Vitest 2.1.9 (`environment: node`)

## テスト結果

| # | テストケース | テストファイル | 結果 |
|---|------------|-------------|------|
| UT-CA-E03 | sanitizeUserNote 201→200 trim / 空→undefined | note.test.ts | ✅ |
| UT-CA-R01/R02 | canRetry/nextStatusOnRetry pending/identified + isTerminalStatus | note.test.ts | ✅ |
| UT-CA-CF01 | runCapturePipeline 正常 (createDiscovery→upload→attach→identify 順) | flow.test.ts | ✅ |
| UT-CA-CF02 | quota 0 → QuotaExceededError (discovery 作成前) | flow.test.ts | ✅ |
| UT-CA-CF03 | upload 失敗 → deleteDiscovery + UploadFailedError | flow.test.ts | ✅ |
| (追加) | AI 同意 OFF → AiConsentRequiredError (discovery 作成前) | flow.test.ts | ✅ |

## 追加テストケース

| # | 対象 | 追加理由 |
|---|------|---------|
| A1 | AI 同意 OFF ガード | SPEC §4.1 ai_consent_revoked_at null 必須 |
| A2 | isTerminalStatus 全 status | status 遷移規則の網羅 |

## サマリー

| 項目 | 値 |
|------|-----|
| 計画テスト数 (本コア該当) | 約 6 件 (E03 + R01/R02 + CF01〜CF03) |
| 追加テスト数 | 5 件 |
| 合計 | 11 件 |
| 成功 | 11 件 / 失敗 0 件 / 成功率 100% |
| capture 行カバレッジ | 98.46% (目標 80% ↑) |
| capture 分岐カバレッジ | 94.73% (目標 75% ↑、critical useCaptureFlow パイプライン 100%) |
| errors/note/status/flow.ts | 行 100% |

## カバレッジ未達・補足
- `index.ts` (barrel) 0%: re-export のみ。
- **defer (本レポート対象外)**: UT-CA-IC01〜IC06 (canvas WebP 変換、helpers/image)、UT-CA-G01〜G05 (geolocation hook)、UT-CA-CF04〜CF07 (Realtime/identify 結果反映の UI 部)、UT-CA-A01〜A04 (実 DB)、UT-CA-IS01〜IS03 (Realtime sub)、UT-CA-E01/E02/B01 (camera/並列/abort)。app bootstrap フェーズで jsdom + node-canvas + CaptureDeps 実装にて実施。

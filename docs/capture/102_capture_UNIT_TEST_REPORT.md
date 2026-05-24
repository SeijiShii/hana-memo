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
- ~~defer~~ → **Phase 3.5 Milestone B で大半解消** (下記追記)。

---

## 追記: Phase 3.5 Milestone B glue テスト (2026-05-24, `/flow:auto` 反復5)

| # | テストケース | テストファイル | 結果 |
|---|------------|-------------|------|
| UT-CA-A01/A04 | createDiscovery 正常 / RLS 403→CaptureError | src/features/capture/captureApi.test.ts | ✅ |
| UT-CA-A02 | attachImage payload + 失敗 | 同上 | ✅ |
| (追加) | deleteDiscovery DELETE?id / fetchDiscoveryStatus GET?discoveryId | 同上 | ✅ |
| UT-CA-IC | useImageConvert: toWebP→stripExif 順 | src/features/capture/hooks.test.tsx | ✅ |
| UT-CA-GEO | useGeolocation: 取得 / 拒否 null | 同上 | ✅ |
| UT-CA-CF01 | useCaptureFlow: create→upload→attach→identify 順序 | 同上 | ✅ |
| UT-CA-CF02 | quota 0 → 例外 + createDiscovery 未呼出 | 同上 | ✅ |
| UT-CA-CF03 | upload 失敗 → deleteDiscovery ロールバック | 同上 | ✅ |
| UT-CA-IS02 | useIdentifyStatus: terminal まで poll | 同上 | ✅ |
| UT-CA-IS03 | unmount で poll 停止 + discoveryId null で no-fetch | 同上 | ✅ |
| UT-CA-E01 | CameraCapture: 画像選択 onCapture / mediaDevices 非対応 fallback / disabled | src/features/capture/CameraCapture.test.tsx | ✅ |
| UT-CA-E03 | parseCreateDiscoveryBody: メモ 201→200 trim + location 検証 | api/capture/discovery.test.ts | ✅ |
| UT-CA-A02(parse) | parseAttachBody: 必須検証 + mime 既定 | api/capture/attach.test.ts | ✅ |

### glue サマリー

| 項目 | 値 |
|------|-----|
| 追加テスト数 | 26 件 (合計 37 件) |
| 全体テスト | **566/566 pass** (was 540)、成功率 100% |
| typecheck / eslint | 0 / 0 |

### 残 (Milestone C / E2E)
- UT-CA-IC01〜06 の実 canvas 変換は node-canvas 不使用方針のため Playwright E2E (実ブラウザ) でカバー。
- UT-CA-CF04〜CF06 (identify 非同期結果の UI バナー反映) / UT-CA-E02 (並列タブ) / UT-CA-B01 (abort) は E2E。
- handler default export (DB dynamic import 部) は単体非対象、Milestone C E2E でカバー。
- **bug fix 記録**: useIdentifyStatus の effect 依存に関数 identity を含めていた暴走 (OOM) を ref 化で解消 (101 参照)。

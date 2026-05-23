# 単体テストレポート: _shared/analytics

## 実施日時
2026-05-23 17:40 (JST)

## 関連ドキュメント
- [003_analytics_UNIT_TEST.md](./003_analytics_UNIT_TEST.md) — 単体テスト項目 (base)
- [revise_sec_004_sentry_pii_scrub_20260523/003_REVISE_UNIT_TEST.md](./revise_sec_004_sentry_pii_scrub_20260523/003_REVISE_UNIT_TEST.md) — SEC-004 追加項目

## テスト実行環境
- ランタイム: Node 20
- テストフレームワーク: Vitest 2.1.9 (`environment: node`, v8 coverage)

## テスト結果

| # | テストケース | テストファイル | 結果 | 備考 |
|---|------------|-------------|------|------|
| UT-AN-SCRUB-01〜14 | PII 7 パターン置換 + null/undefined/number 素通し + nested/array 再帰 + 複数同時 | scrubber.test.ts | ✅ | |
| UT-AN-SCRUB-15 | 5KB PII 多含み < 5ms | scrubber.test.ts | ✅ | NFR §5.1 |
| (追加) | boolean 素通し / Date 非破壊 / 不変文字列 / URL 内 email / PII_PATTERNS=7 | scrubber.test.ts | ✅ | 100% カバレッジ補強 |
| UT-AN-SENTRY-01〜05 | opt-out skip / opt-in init / beforeSend scrub / beforeBreadcrumb scrub / uid hash | sentry.test.ts | ✅ | |
| (追加) | captureException の context scrub / context なし時 err 透過 | sentry.test.ts | ✅ | |
| UT-AN-C01〜C06 | logApiUsage 正常 / 失敗 fail-soft / estimateCost / getMonthlyUsage / refreshMatview | cost.test.ts | ✅ | |
| UT-AN-E01〜E02 | RLS 拒否 fail-soft / estimateCost ゼロ | cost.test.ts | ✅ | |
| (追加) | service 空・負トークン reject / 任意フィールド省略 / env 未設定 NaN / extractRows fallback | cost.test.ts | ✅ | 分岐補強 |
| (openAi/infra)×(設定/未設定) | unit-prices 読み取り | unit-prices.test.ts | ✅ | |
| UT-AN-CHECKQUOTA-PII-01〜02 / UT-AN-EXPORTREV-PII-01 | Slack 通知 scrub / サマリ不変 / CSV パス不変 | slack.test.ts | ✅ | |
| UT-AN-Q06 | Slack webhook URL 未設定 → warn+skip | slack.test.ts | ✅ | |

## 追加テストケース

| # | 対象 | テストケース | 追加理由 |
|---|------|------------|---------|
| A1 | scrubber | boolean/Date/不変/URL内email/PATTERNS長 | 法令対応で行・分岐 100% を担保 |
| A2 | sentry | captureException の context scrub / 透過 | captureException 経路のカバレッジ |
| A3 | cost | バリデーション reject / 省略時 default / env 未設定 / extractRows fallback | 分岐カバレッジ 75%+ 確保 |
| A4 | unit-prices | openAi/infra × 設定/未設定 | infraUnitPrices のカバレッジ |
| A5 | slack | notifySlack POST body 検証 | scrub 経由を spy で確認 |

## サマリー

| 項目 | 値 |
|------|-----|
| 計画テスト数 | 約 32 件 (base C/S/Q/E + revise SCRUB/SENTRY/PII) |
| 追加テスト数 | 18 件 |
| 合計 | 50 件 |
| 成功 | 50 件 |
| 失敗 | 0 件 |
| 成功率 | 100% |
| analytics 行カバレッジ | 99.49% (目標 85% ↑) |
| analytics 分岐カバレッジ | 86.25% (目標 75% ↑) |
| scrubber.ts / sentry.ts / slack.ts | 行 100% (SEC-004 法令要件) |

## カバレッジ未達・補足
- `cost.ts` 分岐 75.6%: 残りは防御的 `??` フォールバック (latencyMs 有無等)。基準 (分岐 75%) は満たす。
- `index.ts` (barrel) 0%: re-export のみ (実行ロジックなし)。
- **defer**: api/ Vercel Cron handler (check-quota / refresh-matview / export-revenue) の E2E / smoke は api/ 層フェーズ。実 Sentry / 実 Slack への 1 件投げ目視確認 (PII 混入ゼロ) は α 公開前に手動実施。

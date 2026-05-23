# 単体テストレポート: account (UI 非依存コア)

## 実施日時
2026-05-23 18:07 (JST)

## 関連ドキュメント
- [003_account_UNIT_TEST.md](./003_account_UNIT_TEST.md)

## テスト実行環境
- Node 20 / Vitest 2.1.9 (`environment: node`)

## テスト結果

| # | テストケース | テストファイル | 結果 |
|---|------------|-------------|------|
| UT-AC-L01〜L03 | validateLocationPrecision precise/coarse/off + 不正 | settings.test.ts | ✅ |
| UT-AC-AI02/AI03 | deriveAiConsentChange OFF→ON / ON→OFF | settings.test.ts | ✅ |
| (追加) | isAiConsentActive revoked 有無 | settings.test.ts | ✅ |
| UT-AC-A02/D03 | sanitizeDeletionReason 501→500 trim / 空→null | deletion.test.ts | ✅ |
| UT-AC-PG01〜PG03/B01 | isPurgeEligible 31日/30日境界/29日/null | deletion.test.ts | ✅ |
| UT-AC-A01/A03 | requestAccountDeletion 未予約/既予約 | deletion.test.ts | ✅ |
| UT-AC-A04/A05 | cancelAccountDeletion 予約済/未予約 | deletion.test.ts | ✅ |

## 追加テストケース

| # | 対象 | 追加理由 |
|---|------|---------|
| A1 | isAiConsentActive | capture の enforce 判定で再利用 |
| A2 | sanitizeDeletionReason 空白/null | 入力堅牢性 |
| A3 | isPurgeEligible 30日 gte 境界 | 削除 critical path (95% 目標) |

## サマリー

| 項目 | 値 |
|------|-----|
| 計画テスト数 (本コア該当) | 約 11 件 (L01〜L03 + AI02/AI03 + A01〜A05 + PG01〜PG03 + B01) |
| 追加テスト数 | 5 件 |
| 合計 | 16 件 |
| 成功 | 16 件 / 失敗 0 件 / 成功率 100% |
| account 行カバレッジ | 98.59% (目標 80% ↑) |
| account 分岐カバレッジ | 95.65% (目標 75% ↑、削除 critical path 100% 達成) |
| settings/deletion/errors.ts | 行 100% |

## カバレッジ未達・補足
- `index.ts` (barrel) 0%: re-export のみ。
- **defer (本レポート対象外)**: UT-AC-H01〜H04 (hook)、UT-AC-S/D/G/L/AI/P の UI 部 (React component)、UT-AC-PG04/PG05 (実 Storage/DB purge)、UT-AC-E01/E02 (RLS/OAuth callback)。app bootstrap フェーズで jsdom + @testing-library/react + AccountDeletionStore 実装にて実施。

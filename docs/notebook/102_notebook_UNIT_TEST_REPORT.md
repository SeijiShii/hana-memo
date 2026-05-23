# 単体テストレポート: notebook (UI 非依存コア)

## 実施日時
2026-05-23 18:13 (JST)

## 関連ドキュメント
- [003_notebook_UNIT_TEST.md](./003_notebook_UNIT_TEST.md)

## テスト実行環境
- Node 20 / Vitest 2.1.9 (`environment: node`)

## テスト結果

| # | テストケース | テストファイル | 結果 |
|---|------------|-------------|------|
| UC3 | clampRadiusKm 0.1/100 境界 | filter.test.ts | ✅ |
| UC3 | matchesFilter season/month/status/circle/keyword/複合AND/空 | filter.test.ts | ✅ |
| UC3 | filterDiscoveries 配列フィルタ | filter.test.ts | ✅ |
| UC1/UC2 | sortByCapturedAtDesc (非破壊) / groupBySpecies (null→__unknown__) | filter.test.ts | ✅ |
| UC4 §4.1 | sanitizeCommonName(100)/sanitizeNoteField(500) trim | edit.test.ts | ✅ |
| UC4 §4.1 | validateLocation 範囲内/範囲外/NaN | edit.test.ts | ✅ |
| UC4 | resolveDisplayName 優先順位 (user>AI>original>不明) | edit.test.ts | ✅ |
| UC4 | buildEditRecord append-only / id 欠落 reject | edit.test.ts | ✅ |

## サマリー

| 項目 | 値 |
|------|-----|
| 合計テスト数 | 20 件 |
| 成功 | 20 件 / 失敗 0 件 / 成功率 100% |
| notebook 行カバレッジ | 98.85% (目標 80% ↑) |
| notebook 分岐カバレッジ | 96.22% (目標 75% ↑) |
| errors/filter.ts | 行 100%、edit/grouping 行 100% |

## カバレッジ未達・補足
- `index.ts`/`types.ts` (barrel/型) 0%: 実行ロジックなし。
- **defer (本レポート対象外)**: 4 モード React view、詳細編集 UI、UC6 コラージュ + Web Share + OG image、useSignedUrl、Realtime、実 DB (UT-NB の UI/IO 部、E-NB-001〜005)。app bootstrap フェーズで jsdom + node-canvas + 実 DB にて実施。E2E は notebook E2E_TEST 参照。

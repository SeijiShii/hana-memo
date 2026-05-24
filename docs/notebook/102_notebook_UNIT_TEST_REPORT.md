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
- ~~defer~~ → **データ層は Phase 3.5 Milestone B で解消** (下記追記)。view/collage は Milestone C。

---

## 追記: Phase 3.5 Milestone B glue テスト (2026-05-24, `/flow:auto` 反復6)

| # | テストケース | テストファイル | 結果 |
|---|------------|-------------|------|
| UT-NB-D01 | fetchDiscoveries items + nextCursor | src/features/notebook/notebookApi.test.ts | ✅ |
| UT-NB-D02 | cursor + limit を query に載せる | 同上 | ✅ |
| UT-NB-D07 | list 失敗 → NotebookError | 同上 | ✅ |
| UT-NB-A01/A02 | updateDiscovery common_name / location PATCH | 同上 | ✅ |
| UT-NB-A03 | softDeleteDiscovery DELETE?id | 同上 | ✅ |
| UT-NB-E01 | 403/404 → NotebookError | 同上 | ✅ |
| UT-NB-D01 | useNotebook mount fetch + capturedAt 降順 | src/features/notebook/hooks.test.tsx | ✅ |
| UT-NB-D03 | useNotebook client filter (season) | 同上 | ✅ |
| UT-NB-D02 | useNotebook loadMore で次ページ蓄積 | 同上 | ✅ |
| UT-NB-A01/A03 | useDiscoveryEdit edit/remove + onMutated + error | 同上 | ✅ |
| UT-NB-A01/A02 | parseEditBody field マッピング + trim + location 範囲 | api/notebook/edit.test.ts | ✅ |

### glue サマリー

| 項目 | 値 |
|------|-----|
| 追加テスト数 | 20 件 (合計 40 件) |
| 全体テスト | **586/586 pass** (was 566)、成功率 100% |
| typecheck / eslint | 0 / 0 |

### 残 (Milestone C / E2E)
- UT-NB-CV/MV/EV (4 モード view)、UT-NB-CC (コラージュ canvas)、UT-NB-SS (Web Share)、UT-NB-U (URL filter 同期) は presentation/browser API のため Playwright E2E。
- UT-NB-D04 (PostGIS 場所円) は MVP では client haversine フィルタで代替、server-side 化は Milestone C。
- handler default export (DB dynamic import 部) は単体非対象、Milestone C E2E でカバー。

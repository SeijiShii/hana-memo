# 単体テストレポート: export (UI 非依存コア)

## 実施日時
2026-05-23 18:19 (JST)

## 関連ドキュメント
- [003_export_UNIT_TEST.md](./003_export_UNIT_TEST.md)

## テスト実行環境
- Node 20 / Vitest 2.1.9 (`environment: node`)

## テスト結果

| # | テストケース | テストファイル | 結果 |
|---|------------|-------------|------|
| E-EX-005 | escapeCsvField カンマ/引用符/改行 + null/数値 | export.test.ts | ✅ |
| E-EX-005 | toCsv BOM デフォルト/抑制/欠落カラム空 | export.test.ts | ✅ |
| §4.1 | validateMonthRange start≤end / 片方 / start>end | export.test.ts | ✅ |
| E-EX-001/003 | validatePdfCount 1-200 / 0 / 201 | export.test.ts | ✅ |
| E-EX-004 | requirePdfUnlocked 未unlock/unlock済 | export.test.ts | ✅ |
| UC1/UC2/UC4 | pdfFilename / csvZipFilename (userId 先頭8) / imagesZipFilename | export.test.ts | ✅ |

## サマリー

| 項目 | 値 |
|------|-----|
| 合計テスト数 | 22 件 |
| 成功 | 22 件 / 失敗 0 件 / 成功率 100% |
| export 行カバレッジ | 98.46% (目標 80% ↑) |
| export 分岐カバレッジ | 96.15% (目標 75% ↑) |
| csv/errors/filename.ts | 行 100%、validation.ts 行 100% |

## カバレッジ未達・補足
- `index.ts` (barrel) 0%: re-export のみ。
- **defer (本レポート対象外)**: UC1 PDF 生成 (jsPDF/html2canvas、E-EX-001 メモリ実測)、UC4 画像 ZIP 並列 (E-EX-006)、E-EX-002 Storage 画像 fetch、React UI、実 DB SELECT。app bootstrap フェーズで jsdom + 実 DB/Storage にて実施。

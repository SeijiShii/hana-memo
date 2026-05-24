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
- ~~defer~~ → **CSV パスは Phase 3.5 Milestone B で解消** (下記追記)。PDF/ZIP レンダリングは Milestone C。

---

## 追記: Phase 3.5 Milestone B glue テスト (2026-05-24, `/flow:auto` 反復7)

| # | テストケース | テストファイル | 結果 |
|---|------------|-------------|------|
| E-EX-002 | fetchExportRows GET + month query / 失敗→ExportError | src/features/export/exportApi.test.ts | ✅ |
| E-EX-005 | buildDiscoveryCsv BOM + escape (カンマ quote) | 同上 | ✅ |
| (download) | downloadTextFile: createObjectURL + a.click + revoke | 同上 | ✅ |
| (csv flow) | useExport.exportCsv: fetch→CSV→downloadTextFile | src/features/export/hooks.test.tsx | ✅ |
| E-EX-004 | exportPdf 未 unlock → ExportError + fetch しない | 同上 | ✅ |
| E-EX-003 | unlock 済 0 件 → ExportError | 同上 | ✅ |
| (pdf flow) | unlock + 件数 OK → renderPdf(rows) → downloadBlob | 同上 | ✅ |
| E-EX-002 | toDiscoveryCsvRow 表示名解決 / null 正規化 + parseMonthParam | api/export/discoveries.test.ts | ✅ |

### glue サマリー

| 項目 | 値 |
|------|-----|
| 追加テスト数 | 12 件 (合計 34 件) |
| 全体テスト | **598/598 pass** (was 586)、成功率 100% |
| typecheck / eslint | 0 / 0 |

### 残 (Milestone C / E2E)
- UC1 実 PDF 生成 (jsPDF/html2canvas、E-EX-001 メモリ実測) は注入 `PdfRenderer` を E2E で実装。
- UC4 画像 ZIP 並列 (JSZip、E-EX-006) / Storage 画像 fetch は Milestone C。
- handler default export (DB dynamic import 部) は単体非対象、Milestone C E2E でカバー。

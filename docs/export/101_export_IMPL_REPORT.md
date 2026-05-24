# 実装レポート: export (UI 非依存コア)

## 実装日時
2026-05-23 18:19 (JST)

## モード
feature — **UI 非依存の出力整形・検証のみ実装**。PDF 生成 (jsPDF/html2canvas) + 画像 ZIP + React UI + 実 DB/Storage は app bootstrap フェーズへ defer。

## 関連ドキュメント
- [001_export_SPEC.md](./001_export_SPEC.md) / [002_export_PLAN.md](./002_export_PLAN.md) / [003_export_UNIT_TEST.md](./003_export_UNIT_TEST.md)
- [AI_LOG](../AI_LOG/D20260523_038_tdd_export.md)

## 変更一覧

### 実装 (純関数)
- `src/features/export/errors.ts` (新規): `ExportError`。
- `src/features/export/csv.ts` (新規): `escapeCsvField` (カンマ/引用符/改行) + `toCsv` (UTF-8 BOM デフォルト付加、E-EX-005) + `DISCOVERY_CSV_COLUMNS`。
- `src/features/export/validation.ts` (新規): `validateMonthRange` (start≤end) + `validatePdfCount` (0→E-EX-003 / >200→E-EX-001) + `requirePdfUnlocked` (E-EX-004)。
- `src/features/export/filename.ts` (新規): `pdfFilename` / `csvZipFilename` (userId 先頭 8) / `imagesZipFilename`。
- `src/features/export/index.ts` (新規): barrel。

## 実装計画からの差分

| 項目 | 内容 |
|------|------|
| 計画にない追加変更 | CSV を汎用 toCsv (columns 指定) + escape + BOM に切り出し (discoveries/edits/consent/billing の 4 CSV で再利用可能)。 |
| 計画から省略した変更 | **defer (app bootstrap)**: PDF 生成 (html2canvas + jsPDF、UC1)、画像 ZIP fetch + 並列制御 + プログレス (UC4、E-EX-006)、React UI (フィルタ/ダウンロード/unlock 誘導)、実 DB SELECT + Storage download (E-EX-002)、メモリ制約 (E-EX-001 実測)。 |
| 想定外の問題と対処 | unlock 確認は `requirePdfUnlocked` 純関数 (billing `usePdfUnlocked` の値を渡す)。CSV BOM はデフォルト ON、`bom:false` で抑制可能に。 |

## PR Description

### タイトル
export: CSV 生成 + エクスポート検証 + ファイル名規約

### 概要
データエクスポートのうち UI 非依存のロジック (UTF-8 BOM 付き CSV 生成・エスケープ、月範囲/PDF 件数/unlock 検証、ファイル名規約) を実装。PDF 生成 + 画像 ZIP + React UI は app bootstrap フェーズへ。

### テスト
- 22 tests pass、export 行 98.46% / 分岐 96.15% (csv/errors/filename 100%)
- 全体 365/365 pass、typecheck clean

---

## 追記: Phase 3.5 Milestone B — CSV エクスポート glue + PDF オーケストレーション (2026-05-24, `/flow:auto` 反復7)

CSV エクスポートを end-to-end で wiring、PDF はオーケストレーション (unlock/件数ガード + 注入レンダラ) を実装。実 jsPDF/html2canvas レンダリング + 画像 ZIP (JSZip) は browser/canvas 依存のため **Milestone C E2E** に残置。

### 追加実装 (Vercel Function / api/export/)
- `api/export/discoveries.ts` (新規、GET `?month`): user の discoveries を CSV 行形に整形 (`toDiscoveryCsvRow` で表示名解決・null 正規化、`parseMonthParam` で月フィルタ)。soft-delete 除外 + user_id スコープ ([SEC-005])。

### 追加実装 (frontend / src/features/export/)
- `exportApi.ts` (新規): `fetchExportRows` (GET) / `buildDiscoveryCsv` (tested `toCsv` + BOM) / `downloadBlob`・`downloadTextFile` (ブラウザ `<a download>` 起動)。
- `hooks.ts` (新規): `useExport` — `exportCsv` (fetch→CSV→download、E-EX-005) / `exportPdf` (requirePdfUnlocked [E-EX-004] → validatePdfCount [E-EX-001/003] → 注入 `PdfRenderer(rows)` → download)。実 jsPDF は app 層/E2E で注入。
- `index.ts` (追記): glue 再輸出。

### glue テスト結果
- 新規 12 tests pass (exportApi 4 / hooks 4 / discoveries parse 4)
- 全体 **598/598 pass** (was 586)、typecheck 0 / eslint 0

### glue 差分メモ
- PDF は `PdfRenderer` 注入型に設計 (unlock/件数ガード + ダウンロードのオーケストレーションを unit test、実 jsPDF レンダリングは E2E)。E-EX-004 は unlock 前に fetch しない順序を保証。
- 画像 ZIP (JSZip) / html2canvas は本反復スコープ外 (browser/canvas、Milestone C)。CSV は完全 wiring。

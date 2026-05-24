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

---

## 追記: Phase 3.5 Milestone C — 書き出しダイアログ presentation (2026-05-24, `/flow:auto` D20260524_051 反復5)

deferred 済の書き出し UI を実装 (CSV ロジック + useExport は実装済を compose、capture/notebook 同 pattern)。

### 追加ファイル (src/features/export/components/)
- `ExportDialog.tsx` (新規): format 選択タブ (CSV / PDF / 画像 ZIP)、「書き出す」action、progress/disabled、error feedback。QuotaModal の dialog/aria パターン。
- `ExportButton.tsx` (新規): 書き出しトリガ。deletion-pending で disabled (SPEC §6.1)。

### 設計判断 (seam + 統合)
- **PDF/ZIP は injectable generator 注入** (`onExportPdf`/`onExportImageZip` props)。jsPDF/html2canvas/JSZip は未 install のまま (reversibility)、generator 不在のタブは「準備中です」表示。CSV は既存 pure ロジックで end-to-end。
- **PDF は `pdfUnlocked` gate** (E-EX-004): unlock 済→「書き出す」/ 未→「アンロックする (¥500 PWYW)」→ `onUnlock`。
- **NotebookPage に `exportProps` props-seam** で統合 (header ボタン + 内部 state の dialog、後方互換、memory 統合と同方式)。App.tsx は未配線 (useExport の token を app 層 auth bootstrap で配線)。
- PLAN の細粒度ファイル分割 (ExportPage/PdfBuilderPage 等) は単一 dialog + format 別注入 action に統合 (既存 export コアが csv.ts/hooks.ts に集約済のため整合)。logic ファイルは無改変。

### テスト結果
- 新規 2 file (ExportDialog 14 / ExportButton 4) + NotebookPage 統合 +3 = +21 tests。
- 全体 **704/704 pass** (was 683)、typecheck 0 / eslint 0。

### 残 (browser 実機検証 + app 層配線)
- 実 PDF (jsPDF + html2canvas) / 画像 ZIP (JSZip) 生成 + download (`<a download>`)。
- modal の視覚レイアウト / `/billing` unlock 導線。
- `useExport({token})` + 実 generator の app 層配線。各 004 ジャーニー E2E (`docs/E2E_GATE_STATUS_20260524.md`)。

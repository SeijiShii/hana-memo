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

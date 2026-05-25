# 改修: 実サムネイル + 発見詳細閲覧 (UC4 閲覧部)

- **issue / slug**: 001 / detail-thumbnail
- **実施日**: 2026-05-25
- **対象機能**: ../README.md (notebook)
- **基準 SPEC**: ../001_notebook_SPEC.md (UC1 / UC4)
- **改修要望** (実機フィードバック): (1) カードのアイコンを実画像サムネに、(2) 行クリックで発見を閲覧 (詳細表示)
- **状態**: 設計完了 (tdd 待ち)

## ドキュメント
- 001_REVISE_SPEC / 002_REVISE_PLAN / 003_REVISE_UNIT_TEST / 004_REVISE_E2E_TEST (MIGRATION 不要)

## スコープ
- サムネ: imageObjectKey → 署名付き GET URL 解決 (useSignedThumbnails) を resolveThumbnail seam に配線
- 詳細: onSelect → /notebook/:id 読み取り専用詳細ページ。**編集/削除/再識別 (UC4 編集/UC5/UC7) は follow-up**

## 関連
- 既存 seam: TimelineView/FigureView/NotebookPage の resolveThumbnail / onSelect
- O44 (R2 GET CORS) / O45 (画像ロード進捗) / O38 (コピー)

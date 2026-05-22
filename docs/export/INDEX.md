# export ドキュメントインデックス

**最終更新**: 2026-05-22 15:55
**生成元**: /flow:feature export

<!-- auto-generated-start -->

## 機能概要
PDF (PWYW unlock) + CSV + JSON + 画像 ZIP エクスポート — 撤退時のデータ持出し対応 (§4.7.5 整合)。

## ファイル一覧（番号順）
| 番号 | ファイル | 種別 | 状態 | 最終更新 | 短い説明 |
|---|---|---|---|---|---|
| 001 | [001_export_SPEC.md](./001_export_SPEC.md) | SPEC | 完了 | 2026-05-22 | 4 UC、jsPDF clientside、CSV/JSON 無料、画像 ZIP |
| 002 | [002_export_PLAN.md](./002_export_PLAN.md) | PLAN | 完了 | 2026-05-22 | Phase 4 分割、JSZip + jsPDF + html2canvas |
| 003 | [003_export_UNIT_TEST.md](./003_export_UNIT_TEST.md) | UNIT_TEST | 完了 | 2026-05-22 | CSV BOM + ページ数 + cancel + 上限境界 |
| 004 | [004_export_E2E_TEST.md](./004_export_E2E_TEST.md) | E2E_TEST | 完了 | 2026-05-22 | 9 シナリオ (E-EX-1〜9、文字化け + 撤退持出し critical) |

## サブフォルダ
| パス | 種別 | issue/slug | 状態 | 概要 | INDEX |
|---|---|---|---|---|---|
| (なし) |

## 関連
- 親 concept: `../concept.md` §1.1 UC3, §1.3.1 export 行, §4.7.5 撤退手順
- **依存**: `_shared/db`, `_shared/storage`, `_shared/auth`, `notebook` (フィルタ借用), `billing` (pdf_unlocked), `account` (削除予約ガード)
- **被依存**: (なし)
- 関連論点: [論点-003] PDF エンジン (解決 D20260522-104)
- 実装コード: `src/features/export/`

## AI アクセスガイド
- 機能概要 → README.md
- PDF (有償) → 001_export_SPEC.md UC1
- CSV/JSON (無料、撤退対応) → 001_export_SPEC.md UC2-UC3 + concept §4.7.5
- 画像 ZIP → 001_export_SPEC.md UC4

## 機能性質タグ
- target_type: feature
- auth-required

<!-- auto-generated-end -->

<!-- user-edit-start -->
<!-- user-edit-end -->

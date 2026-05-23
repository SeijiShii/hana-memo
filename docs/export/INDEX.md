# export ドキュメントインデックス

**最終更新**: 2026-05-23 18:19
**生成元**: /flow:feature export + /flow:tdd (2026-05-23、UI 非依存コア)
**状態**: コア実装完了 (2026-05-23、PDF 生成 / 画像 ZIP / React UI は app bootstrap defer)

<!-- auto-generated-start -->

## 機能概要
PDF (PWYW unlock) + CSV + JSON + 画像 ZIP エクスポート — 撤退時のデータ持出し対応 (§4.7.5 整合)。CSV 生成/検証/ファイル名 実装済。

## ファイル一覧（番号順）
| 番号 | ファイル | 種別 | 状態 | 最終更新 | 短い説明 |
|---|---|---|---|---|---|
| 001 | [001_export_SPEC.md](./001_export_SPEC.md) | SPEC | 完了 | 2026-05-22 | 4 UC、jsPDF clientside、CSV/JSON 無料、画像 ZIP |
| 002 | [002_export_PLAN.md](./002_export_PLAN.md) | PLAN | 完了 | 2026-05-22 | Phase 4 分割、JSZip + jsPDF + html2canvas |
| 003 | [003_export_UNIT_TEST.md](./003_export_UNIT_TEST.md) | UNIT_TEST | 完了 | 2026-05-22 | CSV BOM + ページ数 + cancel + 上限境界 |
| 004 | [004_export_E2E_TEST.md](./004_export_E2E_TEST.md) | E2E_TEST | 完了 | 2026-05-22 | 9 シナリオ (E-EX-1〜9、文字化け + 撤退持出し critical) |
| 101 | [101_export_IMPL_REPORT.md](./101_export_IMPL_REPORT.md) | IMPL_REPORT | コア完了 | 2026-05-23 | csv/validation/filename 実装、PDF/画像ZIP/UI defer |
| 102 | [102_export_UNIT_TEST_REPORT.md](./102_export_UNIT_TEST_REPORT.md) | UNIT_TEST_REPORT | 完了 | 2026-05-23 | 22 tests / 行 98.46% / 分岐 96.15% |

## サブフォルダ
| パス | 種別 | issue/slug | 状態 | 概要 | INDEX |
|---|---|---|---|---|---|
| (なし) |

## 関連
- 親 concept: `../concept.md` §1.1 UC3, §1.3.1 export 行, §4.7.5 撤退手順
- **依存**: `_shared/db`, `_shared/storage`, `_shared/auth`, `notebook` (フィルタ借用), `billing` (pdf_unlocked), `account` (削除予約ガード)
- **被依存**: (なし)
- 関連論点: [論点-003] PDF エンジン (解決 D20260522-104)
- 実装コード (コア): `src/features/export/{errors,csv,validation,filename,index}.ts`
- defer (app bootstrap): PDF 生成 (jsPDF/html2canvas) / 画像 ZIP (JSZip+並列) / React UI / 実 DB SELECT + Storage download

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

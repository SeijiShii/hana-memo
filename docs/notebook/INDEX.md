# notebook ドキュメントインデックス

**最終更新**: 2026-05-23 18:13
**生成元**: /flow:feature notebook + /flow:tdd (2026-05-23、UI 非依存コア)
**状態**: コア実装完了 (2026-05-23、4 モード view / コラージュ / 実 DB は app bootstrap defer)

<!-- auto-generated-start -->

## 機能概要
ノート閲覧 (タイムライン / カレンダー / 地図 / 図鑑 4 モード) + 詳細編集 + 月次コラージュ + UGC シェア (UC2)。フィルタ/編集/グルーピングのデータロジック実装済。

## ファイル一覧（番号順）
| 番号 | ファイル | 種別 | 状態 | 最終更新 | 短い説明 |
|---|---|---|---|---|---|
| 001 | [001_notebook_SPEC.md](./001_notebook_SPEC.md) | SPEC | 完了 | 2026-05-22 | 7 UC、4 モード、編集履歴 (discovery_edits append-only)、月次コラージュ |
| 002 | [002_notebook_PLAN.md](./002_notebook_PLAN.md) | PLAN | 完了 | 2026-05-22 | Phase 5 分割、MapLibre、canvas コラージュ、Vercel OG |
| 003 | [003_notebook_UNIT_TEST.md](./003_notebook_UNIT_TEST.md) | UNIT_TEST | 完了 | 2026-05-22 | フィルタ + 編集履歴 + コラージュ + 強制シェアなし |
| 004 | [004_notebook_E2E_TEST.md](./004_notebook_E2E_TEST.md) | E2E_TEST | 完了 | 2026-05-22 | 10 シナリオ (E-NB-1〜10、強制シェアなし + append-only critical) |
| 101 | [101_notebook_IMPL_REPORT.md](./101_notebook_IMPL_REPORT.md) | IMPL_REPORT | コア完了 | 2026-05-23 | filter/edit/grouping 実装、4 モード view/collage defer |
| 102 | [102_notebook_UNIT_TEST_REPORT.md](./102_notebook_UNIT_TEST_REPORT.md) | UNIT_TEST_REPORT | 完了 | 2026-05-23 | 20 tests / 行 98.85% / 分岐 96.22% |

## サブフォルダ
| パス | 種別 | issue/slug | 状態 | 概要 | INDEX |
|---|---|---|---|---|---|
| (なし) |

## 関連
- 親 concept: `../concept.md` §1.1 UC2, §1.3.1 notebook 行, §4.8.2 製品内グロース
- **依存**: `_shared/db`, `_shared/storage`, `_shared/auth`, `account` (settings), `capture` (retryIdentify)
- **被依存**: `export` (PDF/CSV 元データ), `memory` (季節レコメンド連携)
- 関連論点: [論点-005] アナリティクス利用パターン計測 (α 後)
- 実装コード (コア): `src/features/notebook/{errors,types,filter,edit,grouping,index}.ts`
- defer (app bootstrap): 4 モード React view / 詳細編集 UI / 月次コラージュ canvas / OG image Edge Function / useSignedUrl / Realtime / 実 DB

## AI アクセスガイド
- 機能概要 → README.md
- 4 モード詳細 → 001_notebook_SPEC.md UC2
- 編集履歴 (audit-like) → 001_notebook_SPEC.md UC4 + §3
- UGC グロース (concept §4.8.2 連携) → 001_notebook_SPEC.md UC6 + 004_*_E2E_TEST.md E-NB-7

## 機能性質タグ
- target_type: feature
- auth-required

<!-- auto-generated-end -->

<!-- user-edit-start -->
<!-- user-edit-end -->

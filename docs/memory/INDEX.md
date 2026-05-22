# memory ドキュメントインデックス

**最終更新**: 2026-05-22 16:05
**生成元**: /flow:feature memory

<!-- auto-generated-start -->

## 機能概要
季節レコメンド「去年の今頃」(UC5) — アプリ内バッジ + notebook セクション表示、Push 通知なし (MVP、charter §1.1 整合)。

## ファイル一覧（番号順）
| 番号 | ファイル | 種別 | 状態 | 最終更新 | 短い説明 |
|---|---|---|---|---|---|
| 001 | [001_memory_SPEC.md](./001_memory_SPEC.md) | SPEC | 完了 | 2026-05-22 | 4 UC、±15 日範囲 + season 一致、0 件で非表示 |
| 002 | [002_memory_PLAN.md](./002_memory_PLAN.md) | PLAN | 完了 | 2026-05-22 | Phase 2 分割、notebook 統合、24h キャッシュ |
| 003 | [003_memory_UNIT_TEST.md](./003_memory_UNIT_TEST.md) | UNIT_TEST | 完了 | 2026-05-22 | dateRange + cache + 押し付けない動作検証 |
| 004 | [004_memory_E2E_TEST.md](./004_memory_E2E_TEST.md) | E2E_TEST | 完了 | 2026-05-22 | 7 シナリオ (E-ME-1〜7、charter §2.2 非抵触 critical) |

## サブフォルダ
| パス | 種別 | issue/slug | 状態 | 概要 | INDEX |
|---|---|---|---|---|---|
| (なし) |

## 関連
- 親 concept: `../concept.md` §1.1 UC5, §1.3.1 memory 行
- **依存**: `_shared/db` (discoveries), `_shared/auth`, `_shared/helpers/date`, `_shared/helpers/season`, `notebook` (UI 組込)
- **被依存**: (なし)
- 関連論点: [論点-002] 通知方式 (解決 D20260522-111、Push は α 後再判断)、[論点-008] 南半球 season (未解決、現状北半球前提)
- 実装コード: `src/features/memory/`

## AI アクセスガイド
- 機能概要 → README.md
- レコメンドロジック → 001_memory_SPEC.md §1 UC1
- 押し付けない設計 → 001_memory_SPEC.md §7 + 004_memory_E2E_TEST.md E-ME-2

## 機能性質タグ
- target_type: feature
- auth-required

<!-- auto-generated-end -->

<!-- user-edit-start -->
<!-- user-edit-end -->

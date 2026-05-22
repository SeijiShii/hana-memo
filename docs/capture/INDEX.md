# capture ドキュメントインデックス

**最終更新**: 2026-05-22 15:30
**生成元**: /flow:feature capture

<!-- auto-generated-start -->

## 機能概要
撮影 → AI 同定 → 保存の中核フロー (UC1)。

## ファイル一覧（番号順）
| 番号 | ファイル | 種別 | 状態 | 最終更新 | 短い説明 |
|---|---|---|---|---|---|
| 001 | [001_capture_SPEC.md](./001_capture_SPEC.md) | SPEC | 完了 | 2026-05-22 | 3 UC、status enum、Realtime 通知、EXIF strip 必須 |
| 002 | [002_capture_PLAN.md](./002_capture_PLAN.md) | PLAN | 完了 | 2026-05-22 | Phase 5 分割 (UI→DB→AI→Realtime→quota) |
| 003 | [003_capture_UNIT_TEST.md](./003_capture_UNIT_TEST.md) | UNIT_TEST | 完了 | 2026-05-22 | useCaptureFlow + image 変換 + Realtime mock |
| 004 | [004_capture_E2E_TEST.md](./004_capture_E2E_TEST.md) | E2E_TEST | 完了 | 2026-05-22 | 8 シナリオ (E-CA-1〜8、EXIF strip critical) |

## サブフォルダ
| パス | 種別 | issue/slug | 状態 | 概要 | INDEX |
|---|---|---|---|---|---|
| (なし) |

## 関連
- 親 concept: `../concept.md` §1.1 UC1, §1.3.1 capture 行, §5.2
- **依存**: `_shared/auth`, `_shared/db`, `_shared/storage`, `_shared/ai`, `_shared/helpers/image,location,season`, `account` (user_settings), `legal` (ai_consent)
- **被依存**: `notebook` (一覧), `export` (PDF 対象), `memory` (季節レコメンド), `billing` (使用量参照)
- 関連論点: [論点-004] 位置情報粒度 (解決済 account 側), [論点-006] 匿名 trial (解決済 _shared/auth 側)
- 実装コード: `src/features/capture/`

## AI アクセスガイド
- 機能概要 → README.md
- 中核フロー (UC1) → 001_capture_SPEC.md §1
- ステータス遷移 → 001_capture_SPEC.md §3.1
- EXIF strip 検証 → 004_capture_E2E_TEST.md E-CA-8
- データフロー → ../concept.md §5.2

## 機能性質タグ
- target_type: feature
- auth-required
- external-api (OpenAI)
- stateful (discoveries.status enum)

<!-- auto-generated-end -->

<!-- user-edit-start -->
<!-- user-edit-end -->

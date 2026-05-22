# account ドキュメントインデックス

**最終更新**: 2026-05-22 11:42
**生成元**: /flow:feature account

<!-- auto-generated-start -->

## 機能概要
設定画面 + OAuth リンク UI + プライバシー / AI 同意設定 + アカウント削除 (30 日 grace)。

## ファイル一覧（番号順）
| 番号 | ファイル | 種別 | 状態 | 最終更新 | 短い説明 |
|---|---|---|---|---|---|
| 001 | [001_account_SPEC.md](./001_account_SPEC.md) | SPEC | 完了 | 2026-05-22 | 7 UC、6 section 並列、二段階削除 + 30 日 grace |
| 002 | [002_account_PLAN.md](./002_account_PLAN.md) | PLAN | 完了 | 2026-05-22 | Phase 5 分割 (skeleton→更新→OAuth→削除→legal連携) |
| 003 | [003_account_UNIT_TEST.md](./003_account_UNIT_TEST.md) | UNIT_TEST | 完了 | 2026-05-22 | hook + RPC + コンポーネント + purge Edge |
| 004 | [004_account_E2E_TEST.md](./004_account_E2E_TEST.md) | E2E_TEST | 完了 | 2026-05-22 | 7 シナリオ (E-AC-1 〜 E-AC-7) |

## サブフォルダ（改修・バグ修正・クレーム判定履歴）
| パス | 種別 | issue/slug | 状態 | 概要 | INDEX |
|---|---|---|---|---|---|
| (なし) |

## 関連
- 親 concept: `../concept.md` §1.3.1 account 行
- **依存**: `_shared/auth`, `_shared/db`, `_shared/storage`, `_shared/analytics`, `legal` (同意 hook)
- **被依存**: `capture` (AI 同意 enforce), `billing` (course 表示), `notebook` (削除 gate)
- 関連論点: [論点-002] 通知 (account 配下、α 後), [論点-006] SPAM, [論点-007] 重複アカウント
- 実装コード: `src/features/account/`, `supabase/functions/purge-deleted-users/`

## AI アクセスガイド
- 機能概要 → README.md
- 設定画面構成 → 001_account_SPEC.md UC1
- OAuth リンク → 001_account_SPEC.md UC2
- 削除フロー → 001_account_SPEC.md UC5 + 002_account_PLAN.md Phase 4

## 機能性質タグ
- target_type: feature
- auth-required
- settings

<!-- auto-generated-end -->

<!-- user-edit-start -->
<!-- user-edit-end -->

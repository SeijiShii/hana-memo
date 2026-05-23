# プロジェクトドキュメントインデックス — hana-memo

**最終更新**: 2026-05-23 17:40
**生成元**: /flow:concept、/flow:feature、/flow:tdd 等が自動更新

<!-- auto-generated-start -->

## 中央書類
- [`./concept.md`](./concept.md) — 全体概念設計（最新更新: 2026-05-22）
- [`./DOC_MAP.md`](./DOC_MAP.md) — AI 用エントリポイント（目的別アクセス / 依存グラフ / コマンド使い分け）
- [`./PREREQUISITES.md`](./PREREQUISITES.md) — 実装前準備チェックリスト (API キー / アカウント / 法務 / 認証 / 監視)

## 機能フォルダ
| 優先度 | 基盤 | フォルダ | 状態 | 設計完了 | 改修件数 | バグ修正件数 | クレーム件数 | INDEX |
|---|---|---|---|---|---|---|---|---|
| 1 | ❌ | [legal](./legal/) | **コア実装完了** (UI defer) | 2026-05-22 → 2026-05-23 | 0 | 0 | 0 | [INDEX](./legal/INDEX.md) |
| 3 | ❌ | [account](./account/) | **コア実装完了** (UI defer) | 2026-05-22 → 2026-05-23 | 0 | 0 | 0 | [INDEX](./account/INDEX.md) |
| 4 | ❌ | [capture](./capture/) | **コア実装完了** (UI defer) | 2026-05-22 → 2026-05-23 | 0 | 0 | 0 | [INDEX](./capture/INDEX.md) |
| 4 | ❌ | [notebook](./notebook/) | **コア実装完了** (UI defer) | 2026-05-22 → 2026-05-23 | 0 | 0 | 0 | [INDEX](./notebook/INDEX.md) |
| 4 | ❌ | [billing](./billing/) | **コア実装完了** (UI defer) | 2026-05-22 → 2026-05-23 | 0 | 0 | 0 | [INDEX](./billing/INDEX.md) |
| 5 | ❌ | [export](./export/) | 設計済 | 2026-05-22 | 0 | 0 | 0 | [INDEX](./export/INDEX.md) |
| 5 | ❌ | [memory](./memory/) | 設計済 | 2026-05-22 | 0 | 0 | 0 | [INDEX](./memory/INDEX.md) |

## 横断フォルダ
| 優先度 | フォルダ | 状態 | 設計完了 | 改修件数 | INDEX |
|---|---|---|---|---|---|
| 1 | [_shared/db](./_shared/db/) | **実装完了** | 2026-05-22 → 2026-05-23 | 0 | [INDEX](./_shared/db/INDEX.md) |
| 1 | [_shared/types](./_shared/types/) | **実装完了** | 2026-05-22 → 2026-05-23 | 0 | [INDEX](./_shared/types/INDEX.md) |
| 1 | [_shared/helpers](./_shared/helpers/) | **実装完了** | 2026-05-22 → 2026-05-23 | 0 | [INDEX](./_shared/helpers/INDEX.md) |
| 1 | [_shared/analytics](./_shared/analytics/) | **実装完了** | 2026-05-22 → 2026-05-23 | 1 | [INDEX](./_shared/analytics/INDEX.md) |
| 2 | [_shared/auth](./_shared/auth/) | **コア実装完了** (SDK glue defer) | 2026-05-22 → 2026-05-23 | 0 | [INDEX](./_shared/auth/INDEX.md) |
| 2 | [_shared/storage](./_shared/storage/) | **コア実装完了** (SDK glue defer) | 2026-05-22 → 2026-05-23 | 0 | [INDEX](./_shared/storage/INDEX.md) |
| 2 | [_shared/ai](./_shared/ai/) | **コア実装完了** (SDK glue defer) | 2026-05-22 → 2026-05-23 | 1 | [INDEX](./_shared/ai/INDEX.md) |

## 見積もり
| ファイル | 種別 | 最終更新 |
|---|---|---|
| [estimates/全体_20260523_hana-memo-mvp.md](./estimates/全体_20260523_hana-memo-mvp.md) | whole (phase=detailed) | 2026-05-23 |

## AI アクセスガイド
- プロジェクト全体を理解したい → `concept.md`
- 目的別アクセスガイド → `DOC_MAP.md`
- 実装前準備チェック → `PREREQUISITES.md`
- 特定機能を理解したい → `<feature>/INDEX.md`
- 工数感を知りたい → `estimates/`
- 改修・バグ修正・クレーム判定履歴 → `<feature>/INDEX.md` のサブフォルダ欄
- クレームから着手したい → `/flow:claim` 実行
- 設計判断の経緯 → `AI_LOG/INDEX.md`

<!-- auto-generated-end -->

<!-- user-edit-start -->
<!-- user-edit-end -->

# プロジェクトドキュメントインデックス — hana-memo

**最終更新**: 2026-05-25 07:30
**生成元**: /flow:concept、/flow:feature、/flow:tdd 等が自動更新

<!-- auto-generated-start -->

## 中央書類
- [`./concept.md`](./concept.md) — 全体概念設計（最新更新: 2026-05-22）
- [`./DOC_MAP.md`](./DOC_MAP.md) — AI 用エントリポイント（目的別アクセス / 依存グラフ / コマンド使い分け）
- [`./PREREQUISITES.md`](./PREREQUISITES.md) — 実装前準備チェックリスト (API キー / アカウント / 法務 / 認証 / 監視)

## 機能フォルダ
| 優先度 | 基盤 | フォルダ | 状態 | 設計完了 | 改修件数 | バグ修正件数 | クレーム件数 | INDEX |
|---|---|---|---|---|---|---|---|---|
| 1 | ❌ | [legal](./legal/) | **実装完了** (同意ゲート + 文書ビュー + `api/legal/consents` 永続化済、本文確定は公開前) | 2026-05-22 → 2026-05-25 | 1 | 0 | 0 | [INDEX](./legal/INDEX.md) |
| 3 | ❌ | [account](./account/) | **実装完了** (設定画面 + 削除確認 + `api/account/settings` 永続化済) | 2026-05-22 → 2026-05-25 | 0 | 0 | 0 | [INDEX](./account/INDEX.md) |
| 4 | ❌ | [capture](./capture/) | **実装完了** (撮影画面 presentation + routing 済) | 2026-05-22 → 2026-05-24 | 0 | 0 | 0 | [INDEX](./capture/INDEX.md) |
| 4 | ❌ | [notebook](./notebook/) | **実装完了** (4-mode view + 実サムネ + 発見詳細閲覧 /notebook/:id 済) | 2026-05-22 → 2026-05-25 | 1 | 0 | 0 | [INDEX](./notebook/INDEX.md) |
| 4 | ❌ | [billing](./billing/) | **実装完了** + 改修設計中 (revise_001 ゲスト課金) | 2026-05-22 → 2026-05-26 | 1 | 0 | 0 | [INDEX](./billing/INDEX.md) |
| 5 | ❌ | [export](./export/) | **実装完了** (書き出しダイアログ済、実 PDF/ZIP は app/E2E) | 2026-05-22 → 2026-05-24 | 0 | 0 | 0 | [INDEX](./export/INDEX.md) |
| 5 | ❌ | [memory](./memory/) | **実装完了** (去年の今頃 carousel/badge + recommend 応答 imageObjectKey 済) | 2026-05-22 → 2026-05-25 | 0 | 0 | 0 | [INDEX](./memory/INDEX.md) |

## 横断フォルダ
| 優先度 | フォルダ | 状態 | 設計完了 | 改修件数 | INDEX |
|---|---|---|---|---|---|
| 1 | [_shared/db](./_shared/db/) | **実装完了** | 2026-05-22 → 2026-05-23 | 1 | [INDEX](./_shared/db/INDEX.md) |
| 1 | [_shared/types](./_shared/types/) | **実装完了** | 2026-05-22 → 2026-05-23 | 0 | [INDEX](./_shared/types/INDEX.md) |
| 1 | [_shared/helpers](./_shared/helpers/) | **実装完了** | 2026-05-22 → 2026-05-23 | 0 | [INDEX](./_shared/helpers/INDEX.md) |
| 1 | [_shared/analytics](./_shared/analytics/) | **実装完了** (glue + 実 Sentry binding 済) | 2026-05-22 → 2026-05-24 | 1 | [INDEX](./_shared/analytics/INDEX.md) |
| 2 | [_shared/auth](./_shared/auth/) | **コア実装完了** (SDK glue defer、匿名 sign-in は revise_001 で ticket 方式へ再設計→tdd 待ち) | 2026-05-22 → 2026-05-25 | 1 | [INDEX](./_shared/auth/INDEX.md) |
| 2 | [_shared/storage](./_shared/storage/) | **実装完了** (glue wiring 済) | 2026-05-22 → 2026-05-24 | 0 | [INDEX](./_shared/storage/INDEX.md) |
| 2 | [_shared/ai](./_shared/ai/) | **実装完了** (glue 済、[SEC-001] closed) | 2026-05-22 → 2026-05-24 | 1 | [INDEX](./_shared/ai/INDEX.md) |

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

# プロダクトドキュメントマップ (hana-memo)

**最終更新**: 2026-05-22 18:30 (+09:00)
**最新コマンド**: /flow:concept (D20260522_016, BaaS Pivot) — Supabase → Neon + Vercel + Clerk + R2 + Drizzle 全面切替、E2E 自動化方針追補
**統計**: 機能フォルダ 7 / 横断フォルダ 7 / 改修件数 0 / バグ修正件数 0 / クレーム判定件数 0 / Open 論点 5 件 / Superseded 5 件 / decision 計 119 件

> **このファイルは AI 用エントリポイント**。
> 目的別に「どこから読めばいいか」「次に何を Read すべきか」を示す。詳細は各 INDEX / 各ファイルを参照。

<!-- auto-generated-start -->

## 0. AI 用クイックアクセス（目的別）

| 目的 | 最初に Read | 次に Read | 注記 |
|---|---|---|---|
| プロダクト全体を理解する | [`./concept.md`](./concept.md) (§1, §1.3, §4.2) | [`./INDEX.md`](./INDEX.md) | 5 分で全体像 |
| 実装着手前準備の確認 | [`./PREREQUISITES.md`](./PREREQUISITES.md) | `./concept.md` §10 (Git) | API キー / アカウント / 法務 |
| 特定機能を理解する | `./<feature>/README.md` | `./<feature>/INDEX.md` → `001_*_SPEC.md` | feature 一覧は §2 |
| 改修案件に着手する | `./<feature>/INDEX.md` | `revise_*/001_REVISE_SPEC.md` | `/flow:revise` で生成 |
| バグ修正に着手する | `./<feature>/INDEX.md` | `fix_*/000_調査レポート.md` → `001_ROOT_CAUSE.md` | `/flow:fix` で生成 |
| 顧客クレームを判定する | `/flow:claim` 実行 | `claim_*/001_TRIAGE.md` | 判定後に fix/revise/feature に分岐 |
| 設計判断の経緯を辿る | [`./AI_LOG/INDEX.md`](./AI_LOG/INDEX.md) | 該当セッションファイル | decision_id 索引で grep、113 件 |
| 未決論点を見る | [`./concept.md`](./concept.md) §8 | [`./AI_LOG/INDEX.md`](./AI_LOG/INDEX.md) Open 論点 | 同期されている |
| 工数感を知る | `./estimates/` | 機能別 estimate | `/flow:estimate` で生成 (未生成) |
| コスト・収益追跡を確認 | [`./concept.md`](./concept.md) §4.6 | `_shared/analytics/INDEX.md` + `billing/INDEX.md` | §4.6.2 / §4.6.4.1 必須 |
| 法務書類対応状況を見る | [`./concept.md`](./concept.md) §9 | `legal/INDEX.md` | プラポリ / 利用規約 / 特商法 / AI 同意 ドラフト済 |
| 公開戦略・ドメインを確認 | [`./concept.md`](./concept.md) §4.7 | `PREREQUISITES.md` §3 | MVP は Vercel デフォルト |
| マーケ戦略を確認 | [`./concept.md`](./concept.md) §4.8 | `notebook/INDEX.md` (UGC 製品内グロース) | charter §2.2 抵触なし |
| 観点（考慮漏れ）を確認 | `~/.claude/flow-data/perspectives.md` | — | onboard Step 3.6 結果 |
| 脆弱性レビュー結果を見る | [`./SECURITY_REVIEW_20260523.md`](./SECURITY_REVIEW_20260523.md) | `_shared/{auth,ai,storage,analytics,db}/902_*_IMPL_SECURITY_CHECKLIST.md` | `/flow:secure` L1 + L2、Critical/High は §8 [論点-011]〜[論点-014] |

## 1. プロダクト全体

- **概念設計 (SoT)**: [./concept.md](./concept.md)
  - 一行で言うと: 散歩中に出会った草花を撮るだけで AI が名前を当て、自分だけの植物発見ノートが育っていく PWA
  - 現フェーズ: 企画 → MVP 設計完了 → BaaS Pivot 反映済 → 実装着手前
  - スタック: **Vite + React + TS + Tailwind + Neon (Drizzle) + Clerk + Cloudflare R2 + Vercel Functions + OpenAI gpt-4o-mini + Stripe + Sentry**
  - 最終更新: 2026-05-22
- **プロジェクト INDEX (フラット一覧)**: [./INDEX.md](./INDEX.md)
- **実装前準備チェックリスト**: [./PREREQUISITES.md](./PREREQUISITES.md)
- **見積もり**: [./estimates/](./estimates/)（まだ生成されていない、`/flow:estimate` 推奨）

## 2. 機能フォルダ（業務ドメイン）

| 優先度 | 基盤 | フォルダ | 状態 | INDEX |
|---|---|---|---|---|
| 1 | ❌ | [legal](./legal/) | 設計済 | [INDEX](./legal/INDEX.md) |
| 3 | ❌ | [account](./account/) | 設計済 | [INDEX](./account/INDEX.md) |
| 4 | ❌ | [capture](./capture/) (UC1 中核) | 設計済 | [INDEX](./capture/INDEX.md) |
| 4 | ❌ | [notebook](./notebook/) (UC2) | 設計済 | [INDEX](./notebook/INDEX.md) |
| 4 | ❌ | [billing](./billing/) (UC3 課金) | 設計済 | [INDEX](./billing/INDEX.md) |
| 5 | ❌ | [export](./export/) (UC3 出力) | 設計済 | [INDEX](./export/INDEX.md) |
| 5 | ❌ | [memory](./memory/) (UC5) | 設計済 | [INDEX](./memory/INDEX.md) |

## 3. 横断フォルダ（_shared/*）

| 優先度 | フォルダ | 状態 | INDEX |
|---|---|---|---|
| 1 | [_shared/db](./_shared/db/) | 設計済 | [INDEX](./_shared/db/INDEX.md) |
| 1 | [_shared/types](./_shared/types/) | 設計済 | [INDEX](./_shared/types/INDEX.md) |
| 1 | [_shared/helpers](./_shared/helpers/) | 設計済 | [INDEX](./_shared/helpers/INDEX.md) |
| 1 | [_shared/analytics](./_shared/analytics/) | 設計済 | [INDEX](./_shared/analytics/INDEX.md) |
| 2 | [_shared/auth](./_shared/auth/) | 設計済 | [INDEX](./_shared/auth/INDEX.md) |
| 2 | [_shared/storage](./_shared/storage/) | 設計済 | [INDEX](./_shared/storage/INDEX.md) |
| 2 | [_shared/ai](./_shared/ai/) | 設計済 | [INDEX](./_shared/ai/INDEX.md) |

## 4. 設計判断の経緯

- **AI_LOG インデックス**: [./AI_LOG/INDEX.md](./AI_LOG/INDEX.md)
- **最新セッション 5 件**:
  - [D20260523_017_secure_product_wide.md](./AI_LOG/D20260523_017_secure_product_wide.md) — `/flow:secure` プロダクト全体 (L1 + L2、Critical 2 / High 2 / Medium 2、18 decision)
  - [D20260522_016_concept_baas_pivot.md](./AI_LOG/D20260522_016_concept_baas_pivot.md) — BaaS Pivot (Supabase → Neon スタック、6 decision)
  - [D20260522_015_feature_memory.md](./AI_LOG/D20260522_015_feature_memory.md) — memory 設計 (6 decision)
  - [D20260522_014_feature_export.md](./AI_LOG/D20260522_014_feature_export.md) — export 設計 ([論点-003] 解決)
  - [D20260522_013_feature_billing.md](./AI_LOG/D20260522_013_feature_billing.md) — billing 設計 (Stripe + §4.6.4.1)
- **Open 論点**: 9 件 (concept §8 と同期、論点-011〜014 は /flow:secure 由来)
- **Superseded chain**: 5 件 (論点-002, 003, 004, 006, 007 解決済)

## 5. 観点・選好データ（PJ 外部参照）

- **観点 SoT**: `~/.claude/flow-data/perspectives.md`
  - 適用観点数: O01〜O31 (拡張は本 PJ 設計中に観測されたパターンで反映済 = O22 ゲスト認証 / O29 公開戦略 / O30 広告 / O31 マーケ)
- **開発者選好**: `~/.claude/flow-data/preferences.md`
  - 学習元 PJ 数 (累計): 1 (本 PJ が第 1 号、更新は本 finalize 後に予定)
  - 強い選好カテゴリ: (本 PJ 設計確定で複数候補あり、次回 PJ で 3+ 回確認後に確定化)

## 6. ファイル種別ガイド（番号体系）

| 種別 | 番号 / パターン | パス例 | 生成元 |
|---|---|---|---|
| 機能 SPEC | `001_*_SPEC.md` | `./capture/001_capture_SPEC.md` | `/flow:feature` |
| 機能 PLAN | `002_*_PLAN.md` | `./capture/002_capture_PLAN.md` | `/flow:feature` |
| 単体テスト計画 | `003_*_UNIT_TEST.md` | `./capture/003_capture_UNIT_TEST.md` | `/flow:feature` |
| E2E テスト計画 | `004_*_E2E_TEST.md` | `./capture/004_capture_E2E_TEST.md` | `/flow:feature` |
| 改修サブフォルダ | `revise_<id>_<date>_<slug>/` | `./capture/revise_<id>_.../001_REVISE_SPEC.md` | `/flow:revise` |
| バグ修正サブフォルダ | `fix_<id>_<date>_<slug>/` | `./capture/fix_<id>_.../000_調査レポート.md` | `/flow:fix` |
| クレーム判定サブフォルダ | `claim_<id>_<date>_<slug>/` | `./capture/claim_<id>_.../001_TRIAGE.md` | `/flow:claim` |
| 実装レポート | `101_*_IMPL_REPORT.md` | `./capture/101_capture_IMPL_REPORT.md` | `/dev-tdd` |
| レビュー | `901_*_REVIEW.md` | `./capture/901_capture_REVIEW.md` | `/dev-review` |
| AI_LOG セッション | `D<date>_<sess>_<cmd>_<target>.md` | `./AI_LOG/D20260522_001_concept_initial.md` | 各 flow コマンド |
| 全体見積もり | `全体_<date>_<slug>.md` | `./estimates/全体_20260522_<slug>.md` | `/flow:estimate` |
| 機能別見積もり | `<feature>_<date>.md` | `./estimates/capture_20260522.md` | `/flow:estimate` |

## 7. 依存・優先度グラフ（concept §1.3.3 から導出）

```
優先度 1 (基盤の基盤)
  _shared/db
  _shared/types
  _shared/helpers
  _shared/analytics
  legal

優先度 2 (基盤)
  _shared/auth     ← _shared/db
  _shared/storage  ← _shared/db, _shared/helpers (image)
  _shared/ai       ← _shared/types, _shared/analytics, _shared/storage

優先度 3
  account          ← _shared/auth, _shared/db, _shared/storage, _shared/analytics, legal

優先度 4
  capture          ← _shared/storage, _shared/ai, _shared/db, _shared/helpers, account, legal
  notebook         ← _shared/db, _shared/storage, _shared/auth, account, capture
  billing          ← _shared/auth, _shared/db, _shared/ai, account

優先度 5
  export           ← _shared/db, _shared/storage, notebook, billing, account
  memory           ← _shared/db, _shared/helpers, notebook
```

循環依存: なし ✅

## 8. コマンド使い分けガイド

| やりたいこと | コマンド | 入力 | 主要出力 |
|---|---|---|---|
| 新規 PJ の概念設計 | `/flow:concept` | wants ファイル or 引数 | `./concept.md` + INDEX + DOC_MAP + PREREQUISITES + AI_LOG |
| 既存 PJ のドキュメント逆生成 | `/flow:onboard` | コードベース root | 同上 + perspectives 検出 |
| 新規機能を設計 | `/flow:feature <feature>` | concept.md + 機能フォルダ README | `001_SPEC` 〜 `004_E2E_TEST` |
| 既存機能を改修 | `/flow:revise <feature> <id>` | issue + 既存 SPEC + コード | `revise_*/001_REVISE_SPEC.md` 他 |
| バグ修正 | `/flow:fix <feature> <id>` | バグレポート + コード | `fix_*/000_*` 〜 `004_POSTMORTEM` |
| クレーム判定 | `/flow:claim <claim>` | クレーム本文 | `claim_*/001_TRIAGE.md` + 分岐先 |
| 工数見積もり | `/flow:estimate` | concept or feature | estimate ファイル |
| セキュリティレビュー | `/flow:secure` | 設計 / コード | リスクレポート |
| ドキュメント整合性監査 | `/flow:audit` | docs/ 全体 | 不整合レポート |

## 9. 履歴サマリ（改修 / バグ修正 / クレーム判定）

- **改修件数 (累計)**: 0 件
- **バグ修正件数 (累計)**: 0 件
- **クレーム判定件数 (累計)**: 0 件

## 10. 次の推奨アクション (実装着手前)

1. **PREREQUISITES.md §12 最終チェックリスト**を満たす (API キー取得、`.env.example` 作成、法務書類レビュー)
2. **`/flow:estimate`** で全体見積もり生成 → 開発期間目安
3. **`/flow:secure`** で L1 設計レビュー (Critical/High リスク洗い出し)
4. 実装は **優先度順 (concept §1.3.3 依存グラフ準拠)** で `/dev-tdd` 着手
   - 最初: `_shared/db` (migrations) → `_shared/types` → `_shared/auth` → `legal` → `_shared/ai`/`storage`/`analytics` → `account` → `capture` → `notebook` → `billing` → `export` → `memory`

<!-- auto-generated-end -->

<!-- user-edit-start -->
<!-- user-edit-end -->

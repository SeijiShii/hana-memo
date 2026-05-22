# AI_LOG インデックス — hana-memo

**最終更新**: 2026-05-22 18:30 (+09:00)
**総セッション数**: 16
**総 decision 数**: 119

> このフォルダは AI 主導の自走 / 後追いトレースを目的とする詳細ログ。
> セッションごとに 1 ファイル、append-only、過去ファイルは削除・編集禁止。
> 人間向けサマリは `../concept.md` §7 決定事項ログ を参照。

<!-- auto-generated-start -->

## セッション一覧（新しい順）

| ファイル | 実行日 | コマンド | 対象 | decision 範囲 | 状態 |
|---|---|---|---|---|---|
| [D20260522_016_concept_baas_pivot.md](./D20260522_016_concept_baas_pivot.md) | 2026-05-22 | /flow:concept (UPDATE) | BaaS Pivot 全体 | D20260522-114〜119 | 完了 |
| [D20260522_015_feature_memory.md](./D20260522_015_feature_memory.md) | 2026-05-22 | /flow:feature | memory | D20260522-108〜113 | 完了 |
| [D20260522_014_feature_export.md](./D20260522_014_feature_export.md) | 2026-05-22 | /flow:feature | export | D20260522-102〜107 | 完了 |
| [D20260522_013_feature_billing.md](./D20260522_013_feature_billing.md) | 2026-05-22 | /flow:feature | billing | D20260522-095〜101 | 完了 |
| [D20260522_012_feature_notebook.md](./D20260522_012_feature_notebook.md) | 2026-05-22 | /flow:feature | notebook | D20260522-088〜094 | 完了 |
| [D20260522_011_feature_capture.md](./D20260522_011_feature_capture.md) | 2026-05-22 | /flow:feature | capture | D20260522-081〜087 | 完了 |
| [D20260522_010_feature_account.md](./D20260522_010_feature_account.md) | 2026-05-22 | /flow:feature | account | D20260522-074〜080 | 完了 |
| [D20260522_009_feature__shared_ai.md](./D20260522_009_feature__shared_ai.md) | 2026-05-22 | /flow:feature | _shared/ai | D20260522-066〜073 | 完了 |
| [D20260522_008_feature__shared_storage.md](./D20260522_008_feature__shared_storage.md) | 2026-05-22 | /flow:feature | _shared/storage | D20260522-060〜065 | 完了 |
| [D20260522_007_feature__shared_auth.md](./D20260522_007_feature__shared_auth.md) | 2026-05-22 | /flow:feature | _shared/auth | D20260522-053〜059 | 完了 |
| [D20260522_006_feature_legal.md](./D20260522_006_feature_legal.md) | 2026-05-22 | /flow:feature | legal | D20260522-046〜052 | 完了 |
| [D20260522_005_feature__shared_analytics.md](./D20260522_005_feature__shared_analytics.md) | 2026-05-22 | /flow:feature | _shared/analytics | D20260522-039〜045 | 完了 |
| [D20260522_004_feature__shared_helpers.md](./D20260522_004_feature__shared_helpers.md) | 2026-05-22 | /flow:feature | _shared/helpers | D20260522-032〜038 | 完了 |
| [D20260522_003_feature__shared_types.md](./D20260522_003_feature__shared_types.md) | 2026-05-22 | /flow:feature | _shared/types | D20260522-027〜031 | 完了 |
| [D20260522_002_feature__shared_db.md](./D20260522_002_feature__shared_db.md) | 2026-05-22 | /flow:feature | _shared/db | D20260522-025〜026 | 完了 |
| [D20260522_001_concept_initial.md](./D20260522_001_concept_initial.md) | 2026-05-22 | /flow:concept (initial + UPDATE auth) | initial | D20260522-001〜024 | 完了 |

## decision_id 索引（grep 用、新しい順、最新 20 件）

| ID | command | phase | chosen (短縮) | type | ファイル |
|---|---|---|---|---|---|
| D20260522-119 | /flow:concept (UPDATE) | BaaS Pivot Q5 | 横断 4 + concept + PREREQUISITES 中心 update | auto-recommended | D20260522_016_concept_baas_pivot.md |
| D20260522-118 | /flow:concept (UPDATE) | BaaS Pivot Q4 | Storage = R2 Vercel Function Presigned URL | auto-recommended | D20260522_016_concept_baas_pivot.md |
| D20260522-117 | /flow:concept (UPDATE) | BaaS Pivot Q3 | Auth = Clerk Guest Users β + linkIdentity | auto-recommended | D20260522_016_concept_baas_pivot.md |
| D20260522-116 | /flow:concept (UPDATE) | BaaS Pivot Q2 | Edge Functions → Vercel Functions (Node 20) | auto-recommended | D20260522_016_concept_baas_pivot.md |
| D20260522-115 | /flow:concept (UPDATE) | BaaS Pivot Q1 | Realtime 廃止 → poll fallback | auto-recommended | D20260522_016_concept_baas_pivot.md |
| D20260522-114 | /flow:concept (UPDATE) | BaaS Pivot 採用 | Supabase → Neon + Vercel + Clerk + R2 + Drizzle | auto-recommended | D20260522_016_concept_baas_pivot.md |
| D20260522-113 | /flow:feature | memory Step 6 | E2E 生成 | auto-recommended | D20260522_015_feature_memory.md |
| D20260522-111 | /flow:feature | memory Q2 (論点-002 解決) | アプリ内バッジのみ、Push なし | auto-recommended | D20260522_015_feature_memory.md |
| D20260522-110 | /flow:feature | memory Q1 | 同月日 ±15 日範囲 | auto-recommended | D20260522_015_feature_memory.md |
| D20260522-104 | /flow:feature | export Q1 (論点-003 解決) | clientside jsPDF + html2canvas | auto-recommended | D20260522_014_feature_export.md |
| D20260522-100 | /flow:feature | billing Q4 (§4.6.4.1) | 月次 CSV + Slack 通知 | auto-recommended | D20260522_013_feature_billing.md |
| D20260522-097 | /flow:feature | billing Q1 | Stripe Checkout + Webhook | auto-recommended | D20260522_013_feature_billing.md |
| D20260522-093 | /flow:feature | notebook Q4 (§4.8.2) | 月次フォトコラージュ + 自然なシェア | auto-recommended | D20260522_012_feature_notebook.md |
| D20260522-092 | /flow:feature | notebook Q3 | discovery_edits audit-like | auto-recommended | D20260522_012_feature_notebook.md |
| D20260522-085 | /flow:feature | capture Q3 (論点-004 解決) | location precision 設定参照 | auto-recommended | D20260522_011_feature_capture.md |
| D20260522-078 | /flow:feature | account Q3 | 二段階確認 + 30 日 grace | auto-recommended | D20260522_010_feature_account.md |
| D20260522-070 | /flow:feature | _shared/ai Q3 | Structured Output Schema | auto-recommended | D20260522_009_feature__shared_ai.md |
| D20260522-068 | /flow:feature | _shared/ai Q1 | Edge Function 経由 (API key 秘匿) | auto-recommended | D20260522_009_feature__shared_ai.md |
| D20260522-062 | /flow:feature | _shared/storage Q1 | 単一 private bucket + 階層パス | auto-recommended | D20260522_008_feature__shared_storage.md |
| D20260522-058 | /flow:feature | _shared/auth Q4 (論点-007 解決) | first-link-only データ移行 | auto-recommended | D20260522_007_feature__shared_auth.md |
| D20260522-057 | /flow:feature | _shared/auth Q3 (論点-006 解決) | 3 回 trial + fingerprint | auto-recommended | D20260522_007_feature__shared_auth.md |
| D20260522-050 | /flow:feature | legal | Markdown + React 静的化 | auto-recommended | D20260522_006_feature_legal.md |
| D20260522-022 | /flow:concept (UPDATE) | 認証フロー再設計 | 匿名スタート + OAuth 後リンク | explicit-choice | D20260522_001_concept_initial.md |
| D20260522-002 | /flow:concept | Step 2 / Q1 | hana-memo | auto-recommended | D20260522_001_concept_initial.md |
| D20260522-001 | /flow:concept | Step 1.7 / preferences | 学習元 0 | auto-recommended | D20260522_001_concept_initial.md |

> 完全索引は各セッションファイル内 YAML を grep で参照。

## Open 論点（chosen_type=open、全期間横断）

| ID | 論点タイトル | 採番セッション | 関連 decision |
|---|---|---|---|
| [論点-001] | パスキー (WebAuthn) 採否 (OAuth リンク後の追加要素として、v2) | D20260522_001 | D20260522-016, D20260522-022 |
| [論点-005] | 利用分析ツール導入時期 (α 後判断) | D20260522_001 | D20260522-015 |
| [論点-008] | _shared/helpers/season 南半球対応 | D20260522_004 | D20260522-035 |
| [論点-009] | お問い合わせフォーム実装方針 (自前 Resend vs SaaS) | D20260522_006 | D20260522-051 |
| [論点-010] | 月次集計の規模拡大運用 (BigQuery 連携 等) | D20260522_013 | D20260522-100 |

## Superseded chain（旧 Open → 新解決）

| 旧 ID (open) | 新 ID (解決) | 解決日 | 解決セッション |
|---|---|---|---|
| [論点-002] | D20260522-111 (アプリ内バッジのみ採用、Push α 後再判断) | 2026-05-22 | D20260522_015_feature_memory.md |
| [論点-003] | D20260522-104 (clientside jsPDF + html2canvas) | 2026-05-22 | D20260522_014_feature_export.md |
| [論点-004] | D20260522-085 (user_settings.location_precision 参照) | 2026-05-22 | D20260522_011_feature_capture.md |
| [論点-006] | D20260522-057 (3 回 trial + device fingerprint) | 2026-05-22 | D20260522_007_feature__shared_auth.md |
| [論点-007] | D20260522-058 (first-link-only) | 2026-05-22 | D20260522_007_feature__shared_auth.md |

<!-- auto-generated-end -->

<!-- user-edit-start -->
<!-- user-edit-end -->

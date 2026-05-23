# AI_LOG インデックス — hana-memo

**最終更新**: 2026-05-23 17:54 (+09:00)
**総セッション数**: 31
**総 decision 数**: 228

> 補足: `/flow:estimate` (2026-05-23) は AI_LOG セッション化対象外。生成物は `docs/estimates/全体_20260523_hana-memo-mvp.md` 参照

> このフォルダは AI 主導の自走 / 後追いトレースを目的とする詳細ログ。
> セッションごとに 1 ファイル、append-only、過去ファイルは削除・編集禁止。
> 人間向けサマリは `../concept.md` §7 決定事項ログ を参照。

<!-- auto-generated-start -->

## セッション一覧（新しい順）

| ファイル | 実行日 | コマンド | 対象 | decision 範囲 | 状態 |
|---|---|---|---|---|---|
| [D20260523_031_tdd__shared_storage.md](./D20260523_031_tdd__shared_storage.md) | 2026-05-23 | /flow:tdd _shared/storage | SDK 非依存コア (bucket/validation/presign、28 tests) | D20260523-093〜094 | 完了 |
| [D20260523_030_tdd__shared_auth.md](./D20260523_030_tdd__shared_auth.md) | 2026-05-23 | /flow:tdd _shared/auth | SDK 非依存コア (trial/rls/webhook、25 tests) | D20260523-091〜092 | 完了 |
| [D20260523_029_tdd__shared_analytics.md](./D20260523_029_tdd__shared_analytics.md) | 2026-05-23 | /flow:tdd _shared/analytics | feature + SEC-004 fold-in (50 tests、行 99.49%) | D20260523-087〜090 | 完了 |
| [D20260523_028_auto_continuous.md](./D20260523_028_auto_continuous.md) | 2026-05-23 | /flow:auto continuous | iteration 1 → /flow:tdd _shared/analytics | D20260523-085〜086 | 完了 |
| [D20260523_027_auto_continuous.md](./D20260523_027_auto_continuous.md) | 2026-05-23 | /flow:auto continuous | iteration 1-3 (types + helpers、SEC-003 / SEC-004 反映) | D20260523-079〜084 | 完了 |
| [D20260523_026_tdd__shared_db.md](./D20260523_026_tdd__shared_db.md) | 2026-05-23 | /flow:tdd _shared/db | Phase 0 bootstrap + Phase 1-4 (28/28 pass) | D20260523-067〜078 | 完了 |
| [D20260523_025_auto_continuous.md](./D20260523_025_auto_continuous.md) | 2026-05-23 | /flow:auto | P4 HIT → /flow:tdd (Class B pause) | D20260523-064〜066 | 完了 (Class B pause) |
| [D20260523_024_revise__shared_analytics_sec_004.md](./D20260523_024_revise__shared_analytics_sec_004.md) | 2026-05-23 | /flow:revise _shared/analytics | sec_004 (High 法令必須) | D20260523-051〜063 | 完了 |
| [D20260523_023_resume_continuous.md](./D20260523_023_resume_continuous.md) | 2026-05-23 | /flow:resume continuous | Skill auto-invoke 反復 1 | 進行中 (反復ログ) | 進行中 |
| [D20260523_022_revise__shared_ai_sec_001-003.md](./D20260523_022_revise__shared_ai_sec_001-003.md) | 2026-05-23 | /flow:revise _shared/ai | sec_001-003 (Critical+High bundle) | D20260523-038〜050 | 完了 |
| [D20260523_021_resume_autopick.md](./D20260523_021_resume_autopick.md) | 2026-05-23 | /flow:resume (auto-pick) | P1 → /flow:revise _shared/ai bundle | D20260523-034〜037 | 完了 |
| [D20260523_020_resume_default.md](./D20260523_020_resume_default.md) | 2026-05-23 | /flow:resume | プロジェクト next-step 推奨 | D20260523-031〜033 | 完了 |
| [D20260523_019_secure_list-findings.md](./D20260523_019_secure_list-findings.md) | 2026-05-23 | /flow:secure --list-findings | SEC findings triage (4 件) | D20260523-025〜030 | 完了 |
| [D20260523_018_scenario_init.md](./D20260523_018_scenario_init.md) | 2026-05-23 | /flow:scenario --init | SCENARIO 初版生成 | D20260523-020〜024 | 完了 |
| [D20260523_017_secure_product_wide.md](./D20260523_017_secure_product_wide.md) | 2026-05-23 | /flow:secure | プロダクト全体 (L1+L2) | D20260523-001〜018 (+ commit 019) | 完了 |
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
| D20260523-078 | /flow:tdd _shared/db | Step Z | Git commit (Backend code + Docs 別) | auto-recommended | D20260523_026_tdd__shared_db.md |
| D20260523-077 | /flow:tdd _shared/db | Step 9 | INDEX 連動 + §8 [SEC-002] closed + SCENARIO 進行中 (1/14) | auto-recommended | D20260523_026_tdd__shared_db.md |
| D20260523-075 | /flow:tdd _shared/db | Step 6 | Vitest 28/28 pass | auto-recommended | D20260523_026_tdd__shared_db.md |
| D20260523-070 | /flow:tdd _shared/db | Step 5 Phase 0 | PJ bootstrap (npm install + .env.example) | auto-recommended | D20260523_026_tdd__shared_db.md |
| D20260523-067 | /flow:tdd _shared/db | Step 0.3 | 対象=_shared/db フル TDD (Phase 0 同梱) | explicit-choice | D20260523_026_tdd__shared_db.md |
| D20260523-066 | /flow:auto | Step 6 | Git commit (AI_LOG + INDEX のみ) | auto-recommended | D20260523_025_auto_continuous.md |
| D20260523-065 | /flow:auto | Step 4.3 | Class B 確認: /flow:tdd manual 起動推奨、loop 保留 | explicit-choice | D20260523_025_auto_continuous.md |
| D20260523-064 | /flow:auto | Step 1-3 | P4 HIT → auto-pick = /flow:tdd | auto-recommended | D20260523_025_auto_continuous.md |
| D20260523-063 | /flow:revise _shared/analytics | Step Z | Git commit (revise 4 文書 + INDEX 連動 + §8 履歴 + seed archive + 法務 TODO) | auto-recommended | D20260523_024_revise__shared_analytics_sec_004.md |
| D20260523-061 | /flow:revise _shared/analytics | Step 7.5 | seed `_pending/` → `_pending_archive/` 移動 (全 secure revise 完了) | auto-recommended | D20260523_024_revise__shared_analytics_sec_004.md |
| D20260523-060 | /flow:revise _shared/analytics | Step 7.5 | §8 [論点-014] status 履歴に revise 完了 + 法務 TODO 追記 | auto-recommended | D20260523_024_revise__shared_analytics_sec_004.md |
| D20260523-051 | /flow:revise _shared/analytics | Step 1.2 | 改修要望 = seed 自動取得 ([SEC-004] 法令必須) | auto-recommended | D20260523_024_revise__shared_analytics_sec_004.md |
| D20260523-050 | /flow:revise _shared/ai | Step Z | Git commit (revise 4 文書 + INDEX 連動 + §8 履歴 + seed archive) | auto-recommended | D20260523_022_revise__shared_ai_sec_001-003.md |
| D20260523-048 | /flow:revise _shared/ai | Step 7.5 | seed `_pending/` → `_pending_archive/` 移動 | auto-recommended | D20260523_022_revise__shared_ai_sec_001-003.md |
| D20260523-047 | /flow:revise _shared/ai | Step 7.5 | §8 [論点-011] [論点-013] status 履歴に revise 完了追記 | auto-recommended | D20260523_022_revise__shared_ai_sec_001-003.md |
| D20260523-045 | /flow:revise _shared/ai | Step 7.1 | MIGRATION 不要 (実装未着手 + 新規テーブルのみ) | auto-recommended | D20260523_022_revise__shared_ai_sec_001-003.md |
| D20260523-038 | /flow:revise _shared/ai | Step 1.2 | 改修要望 = seed 自動取得 (SEC-001 + SEC-003 bundle) | auto-recommended | D20260523_022_revise__shared_ai_sec_001-003.md |
| D20260523-037 | /flow:resume (auto-pick) | Step 6 | Git commit (AI_LOG + INDEX のみ) | auto-recommended | D20260523_021_resume_autopick.md |
| D20260523-036 | /flow:resume (auto-pick) | Step 4 | 最終 dispatch 指示 = /flow:revise _shared/ai --resume sec_001-003_rate_limit_ssrf | auto-recommended | D20260523_021_resume_autopick.md |
| D20260523-035 | /flow:resume (auto-pick) | Step 3 | P1 HIT → Critical 最古 + seed あり = SEC-001 bundle | auto-recommended | D20260523_021_resume_autopick.md |
| D20260523-034 | /flow:resume (auto-pick) | Step 1-2 | L1/L2 不整合 0、§8 SEC: Critical 2 + High 2 active | auto-recommended | D20260523_021_resume_autopick.md |
| D20260523-033 | /flow:resume | Step 6 | Git commit (AI_LOG + INDEX のみ) | auto-recommended | D20260523_020_resume_default.md |
| D20260523-032 | /flow:resume | Step 3-4 | 推奨 = /flow:revise _shared/ai --resume sec_001-003_rate_limit_ssrf、ユーザー (a) 採用 | explicit-choice | D20260523_020_resume_default.md |
| D20260523-031 | /flow:resume | Step 1-3 | ケース B 判定 (中断 0 件、シナリオ進行可、補助 secure 4 件) | auto-recommended | D20260523_020_resume_default.md |
| D20260523-030 | /flow:secure --list-findings | Step L.6 | Git commit (triage 結果 + 2 seed + §8 更新) | auto-recommended | D20260523_019_secure_list-findings.md |
| D20260523-029 | /flow:secure --list-findings | Step L.4 | SCENARIO §5 カーソル更新 (3 件 dispatched + 1 件 TDD-handoff) | auto-recommended | D20260523_019_secure_list-findings.md |
| D20260523-028 | /flow:secure --list-findings | Step L.3 ([SEC-004]) | dispatched-to-revise → _shared/analytics seed (legal_required) | explicit-choice | D20260523_019_secure_list-findings.md |
| D20260523-027 | /flow:secure --list-findings | Step L.3 ([SEC-002]) | open 維持 + TDD-handoff annotation | explicit-choice | D20260523_019_secure_list-findings.md |
| D20260523-026 | /flow:secure --list-findings | Step L.3 ([SEC-001+003]) | dispatched-to-revise → _shared/ai bundle seed | explicit-choice | D20260523_019_secure_list-findings.md |
| D20260523-025 | /flow:secure --list-findings | Step L.1-L.2 | 4 件抽出、severity 順表示 | auto-recommended | D20260523_019_secure_list-findings.md |
| D20260523-024 | /flow:scenario --init | Git commit | SCENARIO + AI_LOG コミット | auto-recommended | D20260523_018_scenario_init.md |
| D20260523-023 | /flow:scenario --init | カーソル初期セット | Phase 3 着手前、前提=論点-011〜014 解消 | auto-recommended | D20260523_018_scenario_init.md |
| D20260523-022 | /flow:scenario --init | §4 分岐ルール初期化 | 9 種の分岐パターン定義 | auto-recommended | D20260523_018_scenario_init.md |
| D20260523-021 | /flow:scenario --init | §2 5 Phase + 2.5 採用 | concept / feature / secure / TDD / α 公開 / 運用 | auto-recommended | D20260523_018_scenario_init.md |
| D20260523-020 | /flow:scenario --init | シナリオ種別 | MVP α 公開型 (個人ツール → スモール商用) | auto-recommended | D20260523_018_scenario_init.md |
| D20260523-018 | /flow:secure | §8 論点登録 | [論点-014] Sentry beforeSend PII スクラブ (High / 法令必須) | auto-recommended | D20260523_017_secure_product_wide.md |
| D20260523-017 | /flow:secure | §8 論点登録 | [論点-013] AI Vision SSRF 防御強化 (High) | auto-recommended | D20260523_017_secure_product_wide.md |
| D20260523-016 | /flow:secure | §8 論点登録 | [論点-012] `.env.example` テンプレ作成 (Critical) | auto-recommended | D20260523_017_secure_product_wide.md |
| D20260523-015 | /flow:secure | §8 論点登録 | [論点-011] レート制限の具体的実装 (Critical) | auto-recommended | D20260523_017_secure_product_wide.md |
| D20260523-014 | /flow:secure | L2 生成 | O27 → `_shared/db/902_*.md` | auto-recommended | D20260523_017_secure_product_wide.md |
| D20260523-013 | /flow:secure | L2 生成 | O26 → `_shared/analytics/902_*.md` | auto-recommended | D20260523_017_secure_product_wide.md |
| D20260523-012 | /flow:secure | L2 生成 | O25 → `_shared/storage/902_*.md` | auto-recommended | D20260523_017_secure_product_wide.md |
| D20260523-011 | /flow:secure | L2 生成 | O24 → `_shared/ai/902_*.md` | auto-recommended | D20260523_017_secure_product_wide.md |
| D20260523-010 | /flow:secure | L2 生成 | O23 → `_shared/auth/902_*.md` | auto-recommended | D20260523_017_secure_product_wide.md |
| D20260523-009 | /flow:secure | L4 deps | SKIP (ロックファイル不在、TDD 着手後再実行) | auto-recommended | D20260523_017_secure_product_wide.md |
| D20260523-001 | /flow:secure | PJ 性質 | 複数/公開/有償/PII/AI/国内 → O23-O28 全 6 観点 apply | auto-recommended | D20260523_017_secure_product_wide.md |
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
| [論点-011] | レート制限の具体的実装 (O27、Critical) | D20260523_017 | D20260523-015 |
| [論点-012] | `.env.example` テンプレート作成 (O25、Critical) | D20260523_017 | D20260523-016 |
| [論点-013] | AI Vision の画像 URL 経路 SSRF 防御強化 (O24、High) | D20260523_017 | D20260523-017 |
| [論点-014] | Sentry beforeSend PII スクラブ実装 (O26、High / 法令必須) | D20260523_017 | D20260523-018 |

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

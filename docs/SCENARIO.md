# hana-memo / 植物の名前わかるんメモ 開発シナリオ

> 本ファイルは AI が next-step を判断するための **宣言的参照ドキュメント**。
> `/flow:resume` および引数空起動された各 flow コマンドが本ファイルを Read する。
> §5 現在地カーソルは `/flow:scenario` (および各 flow コマンド) が **auto-generated** で書き換える。ユーザー手動編集は §1〜§4 / §6 のみ。
>
> Resume Contract: `~/.claude/flow-data/resume-contract.md` 準拠

**初版作成**: 2026-05-23
**最終更新セッション**: D20260523_018_scenario_init

---

## 1. ゴール

**散歩中に出会った草花を撮るだけで AI が名前を当て、自分だけの植物発見ノートが育っていく PWA** を、seiji 単独・初期 $0 で MVP α 公開し、PWYW + content-unlock 課金で AI コストを吸収しながらスモール商用 (DAU 100-300) まで段階移行する。

- **第一マイルストーン (MVP α)**: 2026-07 までに招待制 α 公開、DAU 10-30、課金 1 件
- **第二マイルストーン (スモール商用)**: 2026-12 までに DAU 100、月課金回収率 100%、Neon Launch 移行検討
- **撤退判断ゲート**: DAU < 5 が 3 ヶ月連続 + 課金 0 + 改善見込みなし

---

## 2. 進行フェーズ

| # | Phase | 状態 | 完了ゲート | 主担当コマンド |
|---|---|---|---|---|
| 1 | 概念設計 (charter / concept / PREREQUISITES / DOC_MAP / SCENARIO) | ✅ 完了 (2026-05-22) | concept.md §1-§10 確定 + AI_LOG 整合 | `/flow:concept` |
| 2 | 機能・横断設計 (SPEC / PLAN / UNIT_TEST / E2E_TEST × 14 対象) | ✅ 完了 (2026-05-22) | 機能 7 + 横断 7 の全 4 文書揃い + L1 secure 実施済 | `/flow:feature` + `/flow:secure` |
| 2.5 | 設計レベル脆弱性レビュー (L1+L2) | ✅ 完了 (2026-05-23) | SECURITY_REVIEW + L2 checklist + §8 Critical/High 論点登録 | `/flow:secure` |
| 3 | 実装 (TDD、横断 7 → 機能 7 の優先度順) | 🔄 着手前 (前提: 論点-011〜014 解消) | 全 14 対象の 101 実装レポート + 102 単体テストレポート / E2E green | `/flow:tdd` + `/flow:tdd-phase` |
| 4 | α 公開準備 (法務書類 / SECURITY_RUNBOOK / 監視ダッシュボード / L3-L5 監査) | ⏳ 未着手 | プラポリ / 利用規約 / 特商法表記 公開 / Sentry beforeSend 動作確認 / npm audit green / `security-review` L5 完了 | (`/flow:revise legal` + Anthropic `security-review`) |
| 5 | 公開後運用 (コスト追跡 / 撤退判断ゲート / 改善ループ) | ⏳ 未着手 | 月次 §4.6 レビュー / `~/ideas/feedback/hana-memo_revenue.csv` 蓄積 / BEP 達成 or 撤退判断 | (人手月次レビュー + `/flow:claim` + `/flow:revise`) |

> Phase 2.5 は Phase 2 完了後の延長線として独立採番 (今後の L4 deps 再実行や追加 secure サイクルもこの枝)

---

## 3. 各フェーズで使う flow コマンド + 期待アーティファクト + 完了ゲート

### Phase 1: 概念設計

| 入力 | コマンド | 期待出力 | 完了ゲート |
|---|---|---|---|
| `wants.md` / charter / ideate 採用 | `/flow:concept` | `docs/concept.md` / `INDEX.md` / `DOC_MAP.md` / `PREREQUISITES.md` / `SCENARIO.md` (本ファイル) / 機能 README × N | concept §1-§10 が全項目埋まる + 論点はすべて §8 登録 |

### Phase 2: 機能・横断設計

| 入力 | コマンド | 期待出力 | 完了ゲート |
|---|---|---|---|
| concept §1.3 機能優先度 + 各 README | `/flow:feature` (引数空でルート実行 = 連続設計) | 14 対象 × 4 文書 (SPEC / PLAN / UNIT_TEST / E2E_TEST) | 全 14 対象の INDEX が「設計済」 + concept §8 で論点未解消なし (Critical/High) |

### Phase 2.5: 設計レベル脆弱性レビュー

| 入力 | コマンド | 期待出力 | 完了ゲート |
|---|---|---|---|
| concept + 全 SPEC + `perspectives.md` O23-O28 | `/flow:secure` (引数空 = プロダクト全体) | `SECURITY_REVIEW_<date>.md` / `_shared/*/902_*_IMPL_SECURITY_CHECKLIST.md` / §8 論点追加 | L1 検出全件が §8 登録 (Critical/High) or 注記化 (Medium 以下) + L2 5 件配置 |

### Phase 3: 実装 (TDD)

| 入力 | コマンド | 期待出力 | 完了ゲート |
|---|---|---|---|
| 設計 4 文書 + L2 checklist + 論点-011〜014 解消結果 | `/flow:tdd` (引数空 = 連続実装、L1 RED→GREEN→IMPROVE) | 各対象の `101_*_IMPL_REPORT.md` + `102_*_UNIT_TEST_REPORT.md` + 実コード | 14 対象の 101/102 が揃い、全 E2E が green、coverage ≧ 80% |

> **前提条件**: Phase 3 着手前に concept §8 [論点-011]〜[論点-014] 全件解消 (=`/flow:revise` で SPEC/PLAN に反映済、または `/flow:tdd` セッション冒頭 checklist で取り込み済)

### Phase 4: α 公開準備

| 入力 | コマンド | 期待出力 | 完了ゲート |
|---|---|---|---|
| 実装完了状態 / 法務テンプレ / `security-review` スキル | `/flow:revise legal` + Anthropic `security-review` + 手動 | 公開済 `/legal/*` + `SECURITY_RUNBOOK.md` + Sentry / Slack 監視動作確認 + `/flow:secure --phase=deps` clean | 招待制 α URL 公開 + 初回ユーザー 1 名が同定→保存→図鑑出力まで完走 |

### Phase 5: 公開後運用

| 入力 | コマンド | 期待出力 | 完了ゲート |
|---|---|---|---|
| 月次 §4.6 集計 + ユーザーフィードバック | (人手 + `/flow:claim` + `/flow:revise` + `/flow:fix`) | 月次 `exports/revenue_<YYYYMM>.csv` + claim/revise/fix セッション群 + 撤退判断 OR BEP 到達 | DAU 100 到達 (継続) or 撤退判断ゲート発火 (終了プロセス) |

---

## 4. 分岐ルール (発生イベント → 切替先コマンド)

| イベント | 切替先 | 補足 |
|---|---|---|
| ユーザーからバグ報告 | `/flow:fix <feature>` | 機能特定後、`fix_<id>_<date>_<slug>/` に調査・修正計画を生成 |
| 仕様変更要望 (既存機能) | `/flow:revise <feature>` | `revise_<id>_<date>_<slug>/` に変更計画を生成 |
| 新機能追加要望 | `/flow:feature <new-feature>` | concept §1.3 に追加 → feature 4 文書生成 |
| 顧客クレーム (期待 vs. 実装) | `/flow:claim` | 判定後に fix/revise/feature/Won't Fix へ分岐 |
| 脆弱性スキャン再実行要望 | `/flow:secure --phase=deps` | 実装着手後 (lockfile 存在) に必須、CI でも自動化 |
| 新規アイデアが発生 | `/flow:ideate` | hana-memo とは別 PJ として `~/projects/<slug>/` に展開 |
| concept §8 論点が積み上がった | concept §8 解消セッション + `/flow:audit` | 大幅 PJ 方針変更時は `/flow:scenario --reset` も検討 |
| context 中断 / Esc | `/flow:resume` | L1 AI_LOG 「進行中」セッションを再開 (Resume Contract §1) |
| 月次レビュー | 手動 + 月初に `/flow:audit standard` | コスト / 収益 / 撤退判断ゲート評価 |

---

## 5. 現在地カーソル

<!-- AUTO-GENERATED:BEGIN scenario-cursor -->

- **現在フェーズ**: Phase 3 (実装) **進行中** — 14 対象中 **4 件完全 + 5 件コア完了 (横断 7/7 + legal + account)**、5 件残 (機能)
- **完了対象 (Phase 3)**: `_shared/db` / `_shared/types` / `_shared/helpers` / `_shared/analytics` (完全)、`_shared/auth` / `_shared/storage` / `_shared/ai` / `legal` / `account` (UI/SDK 非依存コア完了、glue defer)
- **進行中ターゲット**: なし (次対象選定待ち)
- **直前完了セッション**: D20260523_034_tdd_account (`/flow:auto` continuous iteration 6 → `/flow:tdd account` コア、累計 Vitest 300/300)
- **最終更新時刻**: 2026-05-23T18:07:00+09:00
- **完了フェーズ**: [Phase 1, Phase 2, Phase 2.5]
- **採用方針 (D20260523、ユーザー承認)**: 外部 SDK 依存の横断基盤は **injectable パターンで SDK 非依存コアを先行実装、SDK/React/Vercel glue は app/api bootstrap フェーズへ defer**
- **次の推奨コマンド (優先順)**:
  1. `/flow:auto` (連続実装継続)。次対象 = `capture` → `notebook` → `billing` (優先度 4) → `export`/`memory` (優先度 5)。legal/account コア完了済
  2. 機能は UI コンポーネント (React) 比率が高く、SDK/React glue 同様に **UI 非依存のドメインロジック (バリデーション / 状態遷移 / 整形 / 課金計算等) を先行 TDD、React component + Vercel handler は app bootstrap defer** が見込まれる
- **app/api bootstrap defer 蓄積** (後続フェーズで wiring):
  - analytics: `api/{check-quota,refresh-matview,export-revenue}.ts` + `vercel.json`
  - auth: `provider.tsx`/`guest-session.ts`/`link.ts`/`hooks.ts`/`getFingerprint`/`api/clerk-webhook.ts`/`api/auth/spam-check.ts`/`api/_lib/clerk.ts`
  - storage: `api/storage/{upload-url,signed-url,delete}.ts`/`_lib/r2.ts`/`upload.ts`/`fetch.ts useSignedUrl`/`meta.ts`
  - ai: `api/identify-plant.ts`/`api/_lib/{openai,prompt,schema}.ts`/frontend `identify.ts`/Upstash binding
  - **横断方針**: 上記 glue は app/api bootstrap フェーズ (React + Vite + 各 SDK install をまとめて行う初回統合) で一括 wiring + jsdom/SDK mock テスト
- **PJ bootstrap 完了**: package.json / tsconfig / drizzle / vitest / .env.example (全 23 key) / CLAUDE.md
- **secure findings 状況**:
  - SEC-002 `.env.example` (Critical): ✅ closed
  - SEC-005/006 (Medium): ✅ 解消 (webhook_dedupe + 認可ネガティブテスト)
  - SEC-003 (High SSRF): ✅ 実装反映 (`_shared/helpers/url.ts` assertSafeImageUrl)
  - SEC-004 (High 法令必須 Sentry PII): sha256Hex 完備 (`_shared/helpers/id.ts`)、scrubber は `_shared/analytics` 次回反映
  - SEC-001 (Critical rate limit): `_shared/ai` 実装時に Upstash Ratelimit 統合予定 (dispatched-to-revise)

<!-- AUTO-GENERATED:END scenario-cursor -->

---

## 6. 変更履歴

| 日時 | 変更内容 | 実行者 / セッション |
|---|---|---|
| 2026-05-23T09:07:12+09:00 | 初版作成 (`/flow:scenario --init`)。シナリオ種別 = **MVP α 公開型 (個人ツール → スモール商用 段階移行)**。Phase 1-5 + Phase 2.5 (secure) を採用。現在地カーソルを Phase 3 着手前 + 論点-011〜014 を前提条件としてセット (decision_id=D20260523-020) | /flow:scenario --init (D20260523_018) |
| 2026-05-23T09:35:00+09:00 | §5 カーソル更新: `/flow:secure --list-findings` で 4 件 triage 完了 (3 件 dispatched-to-revise + 1 件 open TDD-handoff)。次の推奨コマンドを `--resume <seed_id>` 形式に詳細化 (decision_id=D20260523-029) | /flow:secure --list-findings (D20260523_019) |
| 2026-05-23T09:55:00+09:00 | §5 カーソル更新: `/flow:revise _shared/ai` で [SEC-001] [SEC-003] の設計反映完了 (4 文書生成、seed を _pending_archive へ移動)。次の推奨を `/flow:revise _shared/analytics` (SEC-004) に進行 | /flow:revise _shared/ai (D20260523_022) |
| 2026-05-23T10:10:00+09:00 | §5 カーソル更新: `/flow:revise _shared/analytics` で [SEC-004] の設計反映完了 (4 文書、scrubber.ts + Sentry beforeSend + Slack 統合)。全 secure revise 完了 → 次の推奨を `/flow:tdd` 連続実装に進行 | /flow:revise _shared/analytics (D20260523_024) |
| 2026-05-23T11:00:00+09:00 | §5 カーソル更新: `/flow:tdd _shared/db` 完遂 (Phase 0 PJ bootstrap + Phase 1-4 schema/access/migrations/seed、Vitest 28/28 pass)。[SEC-002] closed、[SEC-005] / [SEC-006] 解消。Phase 3 = 1/14 完了、次の推奨を `_shared/types` 以降の連続実装に進行 | /flow:tdd _shared/db (D20260523_026) |
| 2026-05-23T17:20:00+09:00 | §5 カーソル更新: `/flow:auto` continuous loop で iteration 1 (_shared/types) + iteration 2 (_shared/helpers) 完遂。Vitest 累計 119/119、[SEC-003] SSRF guard 実装反映 + [SEC-004] sha256Hex 完備。Phase 3 = 3/14 完了。次の推奨を `_shared/analytics` (revise SEC-004 scrubber 反映) に進行 | /flow:auto (D20260523_027) |

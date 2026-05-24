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
| 3 | 実装 (TDD、横断 7 → 機能 7 の優先度順) | 🔄 **コア 14/14 完遂** (全 101/102 揃い、Vitest 373 green、coverage ≥80%)。残ゲート = E2E green (app bootstrap で UI/glue wiring 後) | 全 14 対象の 101 実装レポート + 102 単体テストレポート / E2E green | `/flow:tdd` + `/flow:tdd-phase` |
| 3.5 | **app/api bootstrap** (defer 済 SDK/React/Vercel glue の一括 wiring) | ⏳ 未着手 (次フェーズ) | React+Vite+各 SDK install / provider・hook・api handler wiring / jsdom+SDK mock テスト / E2E green | (手動 install + 統合 + `/flow:tdd` 再走) |
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

- **現在フェーズ**: Phase 3.5 (app/api bootstrap) — **Milestone B 進行中 (auth module wiring 完了)**。Milestone A (foundation) 完了済、Phase 3 コア 14/14 完遂済
- **Milestone A 完了 (2026-05-24, D20260524_048)**: フロントスタック install (React18 / Vite5 / Tailwind3 / react-router-dom / vite-plugin-pwa) + app shell (`index.html` / `vite.config.ts` / `src/{main,App}.tsx` / `index.css` / `tailwind.config.ts` / `postcss.config.js`) + `api/health.ts` (smoke #2) + **`scripts/dev.sh` (O36 launcher、concept §4.5.7)**
- **Milestone B 進捗 (2026-05-24, D20260524_049 /flow:auto 反復 6)**: **auth module glue 完了** — install `@clerk/clerk-react`/`@clerk/backend`/`svix`/`@fingerprintjs/fingerprintjs` + `happy-dom`/`@testing-library/react`。実装: `provider.tsx`/`guest-session.ts`/`link.ts`/`spam-guard.ts`/`hooks.ts` + `api/{_lib/clerk,clerk-webhook,auth/spam-check}.ts`。検証: typecheck 0 / **Vitest 419 green** (新規 46) / eslint 0。`src/vite-env.d.ts` 追加。残: Clerk Guest β 実 sign-in 配線 + E2E (Milestone C)
- **進行中ターゲット**: Phase 3.5 Milestone B 残 module — ✅auth → ✅storage → ✅ai ([SEC-001] closed) → ✅**analytics glue (D20260524_050 反復3、cron + Sentry beforeSend wiring、[SEC-004] は legal TDD 待ち)** → **次=billing (Stripe Checkout + Webhook)** → capture/notebook/export/memory の画面 component
- **直前完了セッション**: D20260524_050 (/flow:auto 反復3: analytics cron handler + 実 Sentry beforeSend binding、Vitest 497 green / 新規 11)
- **最終更新時刻**: 2026-05-24T14:05:00+09:00
- **完了フェーズ**: [Phase 1, Phase 2, Phase 2.5, Phase 3 (コア)]
- **採用方針 (D20260523、ユーザー承認)**: 外部 SDK 依存の横断基盤・機能は **injectable パターンで UI/SDK 非依存コアを先行実装、SDK/React/Vercel glue は app/api bootstrap フェーズ (Phase 3.5) へ defer**
- **次の推奨ステップ (優先順)**:
  1. **Phase 3.5 Milestone B (SDK glue wiring)** 続行: 残 SDK (Stripe + jsPDF / JSZip / DOMPurify) install → defer glue を module 単位で wiring → happy-dom + SDK mock テスト。推奨順 = ✅auth → ✅storage (@aws-sdk) → ✅ai (openai + @upstash、[SEC-001] closed) → ✅analytics (@sentry/browser + cron、[SEC-004] wiring 済) → **billing Stripe (次)** → capture/notebook/export/memory の画面 component
  2. **Milestone C**: E2E green (Playwright smoke ジャーニー、Vercel preview)
  3. その後 Phase 4 (α 公開準備): `/flow:tdd legal sentry-disclosure` (プラポリ実装) + `security-review` L5
- **app/api bootstrap defer 蓄積** (Milestone B で wiring):
  - ✅ analytics (完了 D20260524_050 反復3): `api/{check-quota,refresh-matview}.ts` + `api/_lib/cron.ts` + `sentry-client.ts` (実 Sentry beforeSend)。残 defer = `api/export-revenue.ts` (非 cron)、SEC-004 closure = legal TDD (Phase 4)
  - ✅ auth (完了 D20260524_049): `provider.tsx`/`guest-session.ts`/`link.ts`/`spam-guard.ts`/`hooks.ts`/`api/clerk-webhook.ts`/`api/auth/spam-check.ts`/`api/_lib/clerk.ts`。残=Clerk Guest β 実 sign-in 配線 + E2E (Milestone C)
  - ✅ storage (完了 D20260524_050): `api/storage/{upload-url,signed-url,delete,meta}.ts`/`_lib/{r2,user}.ts`/`upload.ts`/`fetch.ts useSignedUrl`/`meta.ts`。残=E2E (Milestone C) + R2 bucket/CORS 手動運用
  - ✅ ai (完了 D20260524_050、[SEC-001] closed): `api/identify-plant.ts` (runIdentify)/`api/_lib/{openai,ratelimit}.ts`/frontend `identify.ts`/Upstash binding。残=E2E (Milestone C)
  - **横断方針**: 上記 glue は module 単位で wiring + jsdom/SDK mock テスト (Milestone A で stack install + shell は完了済)
- **PJ bootstrap 完了**: package.json / tsconfig / drizzle / vitest / .env.example (全 23 key) / CLAUDE.md / **frontend shell (Vite+React+Tailwind+PWA) + `scripts/dev.sh` (Phase 3.5 Milestone A、O36+O37 の dev.sh 基準を充足。CI yaml は Milestone C で配置)**
- **secure findings 状況**:
  - SEC-002 `.env.example` (Critical): ✅ closed
  - SEC-005/006 (Medium): ✅ 解消 (webhook_dedupe + 認可ネガティブテスト)
  - SEC-003 (High SSRF): ✅ closed (`_shared/helpers/url.ts` assertSafeImageUrl + validateObjectKey、全消費)
  - SEC-007 (High drizzle SQLi): ✅ closed (drizzle-orm 0.45.2、audit high 0)
  - SEC-004 (High 法令必須 Sentry PII): scrubber コア + ✅実 Sentry beforeSend wiring 完了 (`sentry-client.ts` D20260524_050 反復3)、開示設計済 (legal D20260524_046)。closure 残 = legal プラポリ TDD (Phase 4) + α 前 smoke
  - SEC-001 (Critical rate limit): ✅ closed (D20260524_050 反復2、`api/_lib/ratelimit.ts` Upstash binding + `api/identify-plant` runIdentify で強制)。残 = 実 Redis E2E smoke (Milestone C)

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

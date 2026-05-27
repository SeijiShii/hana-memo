# hana-memo / 植物の名前わかるんメモ 開発シナリオ

> 本ファイルは AI が next-step を判断するための **宣言的参照ドキュメント**。
> `/flow:resume` および引数空起動された各 flow コマンドが本ファイルを Read する。
> §5 現在地カーソルは `/flow:scenario` (および各 flow コマンド) が **auto-generated** で書き換える。ユーザー手動編集は §1〜§4 / §6 のみ。
>
> Resume Contract: `~/.claude/flow-data/resume-contract.md` 準拠

**初版作成**: 2026-05-23
**最終更新セッション**: D20260527_001_scenario_update

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
| 3 | 実装 (TDD、横断 7 → 機能 7 の優先度順) | ✅ 完了 (2026-05-25) | 全 14 対象の 101/102 + 全画面実装 + no-key E2E smoke green、coverage ≥80% | `/flow:tdd` + `/flow:tdd-phase` |
| 3.5 | **app/api bootstrap** (defer 済 SDK/React/Vercel glue の一括 wiring) | ✅ 完了 (2026-05-25) | 全 SDK glue + 全 feature データ/UI glue wiring + app 統合配線 + E2E smoke green | (手動 install + 統合 + `/flow:tdd` 再走) |
| 4 | α 公開準備 (billing改修 / 関数統合 / デプロイ / 法務 / 監視) | 🔄 **進行中** — billing revise_001 ✅ + 関数統合 24→11 ✅ + **デプロイ preview で end-to-end 検証済** (2026-05-27)。残 = prod 公開 + webhook 本登録 + wording + 告知 | preview 検証済。prod URL 公開 + Stripe/Clerk webhook 本登録 + R2 CORS prod origin + 初回ユーザー完走 | `/flow:revise` + `/flow:release` + `security-review` |
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

- **現在フェーズ**: Phase 4 (α 公開準備) — **デプロイ preview で end-to-end 検証済 (2026-05-27)**。Phase 3 / 3.5 完了済。残 = prod 公開 + webhook 本登録 + wording + 告知 + branch merge
- **✅ billing revise_001 完了 (2026-05-26, D20260526_069/072/073)**: 課金を**ゲストのままログイン不要・¥100=AI10回の単発購入のみ**に改修。pdf_unlock / PWYW / **export 機能を全廃** (`src/features/export` 削除)、OAuth リンク必須ガード撤廃、購入履歴 UI なし (台帳は内部保持)。理由 = ¥100 上限でリスクを縛れる (perspectives O46)。`create-checkout-session` は ai_credits のみ受領、guest 課金可
- **✅ Vercel 関数統合 完了 (2026-05-26)**: Hobby 12-fn 上限ブロック解消のため `api/` を **24→11 に group catch-all 統合** (`api/<group>/[...path].ts` + `api/_lib/router.ts createGroupRouter`、storage/billing/capture/notebook/auth/cron/legal/account/memory 9 群)。`_handler-contract.test.ts` が 9≤fn≤12 を恒久ガード (O49)
- **✅ デプロイ preview フル検証 (2026-05-27, 最新 o0kzr26l6)**: 起動 / guest auth=200 / **撮影 (インラインカメラ・スマホ OK) → R2 アップロード → AI 識別 → Checkout → 決済後アプリ復帰** が end-to-end で通った。乗り越えた壁 5 件:
  - **関数数上限** (24→11 統合)
  - **ESM 拡張子なし import の本番500** → `scripts/vercel-build.mjs` (Build Output API + esbuild で各関数を自己完結 bundle) + `vercel build && vercel deploy --prebuilt` (リモート auto-detect 回避、O51 addendum)
  - **R2 CORS** (`scripts/r2-cors.json`、origin 毎・ユーザー適用)
  - **モバイル撮影 OOM** → inline getUserMedia camera (`<input capture>` 廃止、O53)
  - **決済後 localhost 飛び** → success_url を req origin 由来に (`baseUrlFromRequest`)
- **✅ E2E**: no-key smoke 8 green (CI 恒久ゲート) + billing 無課金 3 ジャーニー。実サービス E2E は preview 実機で目視検証済
- **SEC-004 (法令必須) closure**: legal sentry-disclosure revise **実装済** (`src/features/legal/versions.ts` privacy_policy=v1.1.0 + `docs/legal/privacy_policy.md` §4 Sentry スクラブ開示)。残 = α 前 実 Sentry 1 件目視 (PII 混入ゼロ確認) のみ
- **残作業 (prod 公開、すべて preview 検証済の延長)**:
  1. **prod デプロイ**: `vercel build && vercel deploy --prebuilt --prod` (env は `--env`/`--build-env` inline、Git 未連携のため)
  2. **prod 固有設定** (本番ドメイン確定後、ユーザー dashboard 作業 = Class B/C): Stripe webhook endpoint `https://<本番>/api/billing/stripe-webhook` 登録 → whsec を prod env へ (これでクレジット付与が走る、ロジックはローカルで credits=10 検証済) / Clerk webhook URL を `/api/auth/clerk-webhook` に / R2 CORS に本番 origin 追加 / live 課金か test のまま判断 (現状 test モード)
  3. **branch `flow/revise-billing-20260526` を main へマージ**
  4. **仕上げ**: `/flow:wording` (UI 文言 1 度も未校正、Wording gate P4.45) + `/flow:promote` (告知)
- **最終更新時刻**: 2026-05-27T12:10:00+09:00
- **完了フェーズ**: [Phase 1, Phase 2, Phase 2.5, Phase 3, Phase 3.5]
- **採用方針 (D20260523、ユーザー承認)**: 外部 SDK 依存の横断基盤・機能は injectable パターンで UI/SDK 非依存コアを先行実装、SDK/React/Vercel glue は app/api bootstrap フェーズ (Phase 3.5) へ defer (完了済)
- **直前セッション**: D20260527_001 (/flow:audit light → 追跡 drift 5件検出 → /flow:scenario --update で §5 を現実同期)
- **secure findings 状況** (全 closed / SEC-004 のみ α前 smoke 残):
  - SEC-001 rate limit (Critical): ✅ closed / SEC-002 .env.example (Critical): ✅ closed
  - SEC-003 SSRF (High): ✅ closed / SEC-007 drizzle SQLi (High): ✅ closed
  - SEC-005/006 (Medium): ✅ closed
  - SEC-004 Sentry PII (High 法令必須): scrubber + 実 Sentry wiring + **legal 開示実装済**。残 = α 前 実投げ 1 件目視のみ

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
| 2026-05-25T07:30:00+09:00 | §5 カーソル更新: `/flow:auto` continuous loop (反復1-4) で Phase 3.5 Milestone C の**残 Class-A buildable backend seam を全完遂** — `api/legal/consents` (GET/POST) + `api/account/settings` (GET/PATCH) 永続化 endpoint + notebook/memory discovery 応答 `imageObjectKey` (images leftJoin)。Vitest 810→853 green (+43)、commit 69d2c48〜861d870。headless 達成可能スコープ完遂 + 残は実 keys/browser/Vercel preview(Class B) 必須のため §4.5.1 #5+#2 で停止。§1.5.8 runtime verification は依然 pending | /flow:auto (D20260525_052) |
| 2026-05-27T12:10:00+09:00 | §2 / §5 大幅同期 (drift reconcile): `/flow:audit` light が「§5 が 05-25 のまま 21 commits 分の作業未反映」と検出 → Phase 3/3.5 を ✅ 完了、Phase 4 を 🔄 進行中 に。**billing revise_001 (課金をゲスト ¥100=10回単発のみに改修 + export 全廃) / 関数統合 24→11 / デプロイ preview で撮影→識別→Checkout→復帰 end-to-end 検証済** を §5 に記録。乗り越えた壁 5 件 (関数数上限 / ESM本番500 / R2 CORS / モバイルOOM / success_url localhost) を明記。残 = prod 公開 + webhook 本登録 + wording + 告知 (decision_id=D20260527-001) | /flow:scenario --update (D20260527_001) |

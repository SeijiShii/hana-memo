# E2E ゲート状況レポート — hana-memo

- **作成**: 2026-05-24 (`/flow:e2e` continuous、`/flow:auto` D20260524_051 反復1 から dispatch)
- **状態**: 🚫 **BLOCKED** — feature journey E2E は実行不可 (前提未達)
- **FW**: Playwright (concept §4 で宣言済、未 install)
- **対象 URL 想定**: ローカル dev server (`scripts/dev.sh`) → 将来 Vercel preview (Class B)

---

## 1. 結論

全 7 feature の E2E ジャーニー (`004_*_E2E_TEST.md`) は **現時点で 1 件も実行できない**。
理由は実装バグではなく、**プレゼンテーション層 (画面 + ルーティング) が未実装**であるため (Milestone B で意図的に defer された範囲)。

`/flow:e2e` 根本原則 #2「unit 完了が前提 — E2E は実装済みの機能に対して走る」+ やってはいけないこと #1「unit 未実装の対象に E2E を走らせる (実装が無いと永遠に red)」に従い、**permanently-red な spec を書かず blocked と記録**して停止する。

## 2. 現状のフロントエンド (Milestone A/B 完了時点)

| 項目 | 状態 |
|---|---|
| app shell (`main.tsx` / `App.tsx` / `index.css` / Vite/PWA) | ✅ あり |
| ルーティング | ⚠️ `/` → placeholder `Home` の **1 ルートのみ** |
| feature 画面コンポーネント | ❌ **0 個** (page/screen/view 無し) |
| 存在する `.tsx` | `main.tsx` / `App.tsx` / `capture/CameraCapture.tsx` / `billing/OAuthRequiredModal.tsx` / `auth/provider.tsx` の 5 個のみ。後者 2 つは **ルーティング未接続** |
| データ層 / hooks / api client / SDK glue | ✅ 完了 (607 unit tests green) |

→ 走らせると placeholder home しか描画されず、全ジャーニーが selector 不在で red になる。

## 3. ブロックされている E2E ジャーニー (104 シナリオ規模)

| target | 004 計画 | 代表ジャーニー | 必要だが未実装の画面 |
|---|---|---|---|
| capture | `004_capture_E2E_TEST.md` (8 シナリオ) | 撮影→識別→一覧反映 / OAuth 誘導 / 同意 OFF / EXIF strip | 撮影画面ルート + 識別結果 + 一覧反映 |
| notebook | `004_notebook_E2E_TEST.md` | 図鑑 4 モード view (timeline/calendar/map/figure) | notebook view 画面 (MS-C) |
| memory | `004_memory_E2E_TEST.md` | 季節レコメンド表示 / バッジ | memory UI (バッジ・カルーセル、MS-C) |
| export | `004_export_E2E_TEST.md` | CSV / PDF / 画像 ZIP 書き出し | export 画面 + 実 PDF (MS-C) |
| billing | `004_billing_E2E_TEST.md` | PWYW checkout / unlock | 課金画面ルート (modal は接続待ち) |
| legal | `004_legal_E2E_TEST.md` | プラポリ同意フロー | legal 画面ルート (UI defer) |
| account | `004_account_E2E_TEST.md` | 設定 / アカウント削除 | 設定画面ルート (UI defer) |

## 4. ゲート通過に必要な前提 (= Milestone C presentation)

1. **ルーティング/ナビゲーション shell** の構築 (各 feature 画面の route 定義 + nav)
2. 各 feature の **画面コンポーネント実装** (既存 hooks/api client を消費。logic は実装済なので presentation + wiring が主)
3. その後 `/flow:e2e` 再走 → Playwright install + dev server webServer 設定 + 各 004 ジャーニー実装 → green
4. 実 Vercel preview / 実 Redis / 実 R2 に対する E2E は **Class B** (別途確認)

## 5. ハンドオフ

- これは `/flow:fix` seed ではない (バグではなく計画的 defer の未完了実装)。
- 次アクション = **Milestone C presentation 実装** (画面 + ルーティング)。完了後に本ゲートを再評価。
- Playwright の install は「最初の実画面が routable になった時点」で smoke と同時に行う方が無駄がない (placeholder への smoke は make-work のため見送り)。

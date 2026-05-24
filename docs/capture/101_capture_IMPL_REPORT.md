# 実装レポート: capture (UI 非依存コア)

## 実装日時
2026-05-23 18:10 (JST)

## モード
feature — **UI 非依存の撮影パイプライン orchestration + 状態遷移のみ実装**。React hooks (image convert/geolocation/captureFlow/identifyStatus) + camera + Realtime + 実 IO は app bootstrap フェーズへ defer。

## 関連ドキュメント
- [001_capture_SPEC.md](./001_capture_SPEC.md) / [002_capture_PLAN.md](./002_capture_PLAN.md) / [003_capture_UNIT_TEST.md](./003_capture_UNIT_TEST.md)
- [AI_LOG](../AI_LOG/D20260523_035_tdd_capture.md)

## 変更一覧

### 実装 (純ロジック + DI)
- `src/features/capture/errors.ts` (新規): `CaptureError` / `AiConsentRequiredError`。
- `src/features/capture/note.ts` (新規): `sanitizeUserNote` (trim 200)。
- `src/features/capture/status.ts` (新規): `DISCOVERY_STATUSES` + `isTerminalStatus` + `canRetry` + `nextStatusOnRetry` (pending→identifying、それ以外は CaptureError)。
- `src/features/capture/flow.ts` (新規): `runCapturePipeline` (CaptureDeps DI) — 同意/quota 事前チェック → createDiscovery → upload[失敗→deleteDiscovery] → attachImage → triggerIdentify の同期パイプライン。
- `src/features/capture/index.ts` (新規): barrel。
- 再利用: quota は `_shared/ai QuotaExceededError`、upload 失敗は `_shared/storage UploadFailedError`、AI 同意判定は `account isAiConsentActive`。

## 実装計画からの差分

| 項目 | 内容 |
|------|------|
| 計画にない追加変更 | 撮影フローを CaptureDeps DI の純オーケストレーションに切り出し (React/IO 非依存でステップ順序と失敗ロールバックを検証可能化)。 |
| 計画から省略した変更 | **defer (app bootstrap)**: `useImageConvert` (canvas WebP + EXIF strip、helpers/image.ts は browser-only 実装済) / `useGeolocation` (helpers/location 再利用) / `useCaptureFlow` React hook + `useIdentifyStatus` (Realtime/poll、UT-CA-IS/CF04〜CF07 UI 部) / 実 captureApi (DB INSERT/UPDATE/DELETE、UT-CA-A01〜A04) / camera UI (UT-CA-E01)。 |
| 想定外の問題と対処 | identify の非同期結果→status 反映 (CF04〜CF06) は Realtime 経由のため hook 側 (defer)。本コアは同期パイプライン (CF01〜CF03) + status 遷移規則に集中。 |

## PR Description

### タイトル
capture: 撮影パイプライン orchestration + discovery 状態遷移

### 概要
撮影→AI識別→保存フローのうち UI/IO 非依存のロジック (同意/quota 事前チェック付き同期パイプライン、upload 失敗時ロールバック、補助メモ整形、discovery status 遷移・再識別規則) を実装。React hooks + camera + Realtime + 実 IO は app bootstrap フェーズへ。

### テスト
- 11 tests pass、capture 行 98.46% / 分岐 94.73% (errors/flow/note/status 100%)
- 全体 309/309 pass、typecheck clean

---

## 追記: Phase 3.5 Milestone B — 撮影画面 UI glue wiring (2026-05-24, `/flow:auto` 反復5)

defer 済の React hooks / camera UI / 実 IO を wiring (core `runCapturePipeline` は injectable のまま再利用)。Realtime は Vercel+Neon 構成に無いため status poll で代替。

### 追加実装 (Vercel Function / api/capture/)
- `api/capture/discovery.ts` (新規): POST `parseCreateDiscoveryBody` → discoveries INSERT (status=identifying)、DELETE `?id` ロールバック。user_id スコープ強制 ([SEC-005])、userNote は sanitizeUserNote (trim 200)。
- `api/capture/attach.ts` (新規): POST `parseAttachBody` → images INSERT + discoveries.image_id UPDATE。`validateObjectKey` で所有確認 ([SEC-003]/[SEC-005])。
- `api/capture/status.ts` (新規、GET `?discoveryId`): status + 識別結果を返す (poll 用、user_id スコープ)。

### 追加実装 (frontend / src/features/capture/)
- `captureApi.ts` (新規): `createDiscovery` (A01/A04) / `attachImage` (A02) / `deleteDiscovery` (CF03 ロールバック) / `fetchDiscoveryStatus` (poll)。
- `hooks.ts` (新規): `useImageConvert` (toWebP→stripExif) / `useGeolocation` (getCurrentLocation) / `useCaptureFlow` (runCapturePipeline に captureApi+upload+identify を注入、CF01-03) / `useIdentifyStatus` (status poll、IS02/IS03)。
- `CameraCapture.tsx` (新規): `<input capture=environment>` ベース、mediaDevices 非対応で folder 選択 fallback (E01)。
- `index.ts` (追記): glue 再輸出。

### glue テスト結果
- 新規 26 tests pass (captureApi 6 / hooks 9 / CameraCapture 3 / discovery parse 5 / attach parse 3)
- 全体 **566/566 pass** (was 540)、typecheck 0 / eslint 0

### glue 差分メモ + 発見バグ
- **[bug fix] `useIdentifyStatus` の poll loop 暴走**: 初版は effect の依存配列に `sleep`/`fetchFn` (関数 identity) を含めていたため、caller が inline 関数を渡すと `setResult` の再 render ごとに effect が再発火 → poll loop が無限増殖し OOM (テストが 186s で worker crash)。`fetchFn`/`sleep`/`onUpdate` を ref 化し effect 依存を `[discoveryId, token, pollIntervalMs]` の安定値のみに修正 (production footgun の解消、グローバル UI デバッグ方針: 実挙動=OOM から根本原因特定)。
- 元 PLAN は Supabase Edge Fn/Realtime 前提 → Vercel api/capture/ + status poll に置換 (先行 glue と同方針)。triggerIdentify は `_shared/ai identifyPlant` を再利用 (objectKey は upload 結果を closure で受け渡し)。

## 追記: Phase 3.5 Milestone C — 撮影画面 presentation + routing (2026-05-24, `/flow:auto` D20260524_051)

defer 済の screen/page 層を実装 (PLAN §1 の pages/components、logic/hooks は Milestone B で実装済を compose)。

### 追加ファイル
- `src/lib/utils.ts` (新規): `cn(...)` (clsx + tailwind-merge)。shadcn 互換 foundation (CLI 未使用、Tailwind + cn で構築)。
- `src/features/capture/components/CaptureButton.tsx` (新規): quota 事前 check。`linkRequired || quotaRemaining<=0` で `QuotaModal` を開き、それ以外は `CameraCapture` を描画。
- `src/features/capture/components/QuotaModal.tsx` (新規): `reason='quota'`→課金画面 / `'link_required'`→OAuth 誘導。`useNavigate`、`OAuthRequiredModal` と同じ dialog/aria パターン。
- `src/features/capture/pages/CapturePage.tsx` (新規): 撮影画面。`aiConsentActive=false` で「AI 同意が必要」+ 設定導線。撮影完了 → router state で File を載せ `/capture/preview` へ。
- `src/features/capture/pages/PreviewPage.tsx` (新規): プレビュー + 補助メモ (`sanitizeUserNote`/`MAX_USER_NOTE`) + 「これでよい」(onConfirm 注入 → `/notebook`) / 「撮り直し」(`/capture`)。File 不在の deep link は `/capture` へ redirect。
- `App.tsx` (変更): `/capture`, `/capture/preview` route + Home から「撮影する」導線。`index.ts` に barrel 追記。

### 設計判断 (注入 seam)
- **quota / ai_consent / confirm は props 注入**: app 層の `useAiCredits`/`isAiConsentActive`/`useCaptureFlow` は token / Blob / pipeline input を要し screen の責務外。`quotaRemaining`/`linkRequired`/`aiConsentActive`/`onConfirm` を props 化して presentation seam として独立テスト可能に (PLAN が prop fallback を許容)。実 hook 配線は app 統合 (今後の整合フェーズ)。
- `link_required` CTA は `/billing` へ (OAuth linking は billing `OAuthRequiredModal`)。`/billing`/`/settings`/`/notebook` は navigate のみ (画面は別 target で構築)。

### テスト結果
- 新規 5 file / +20 tests (utils 4 / CaptureButton / QuotaModal / CapturePage / PreviewPage)。
- 全体 **627/627 pass** (was 607)、typecheck 0 / eslint 0 (happy-dom + testing-library)。

### 残 (browser 実機検証が必要、E2E gate)
- `<input capture=environment>` の実機カメラ起動 (iOS Safari PWA standalone、PLAN §6)。
- Tailwind の視覚レイアウト / modal 表示。
- `URL.createObjectURL` の実プレビュー (happy-dom は stub)。
- 実 hook (`useAiCredits`/`useCaptureFlow`) の app 層配線 + 各 004 ジャーニーの E2E (`docs/E2E_GATE_STATUS_20260524.md`)。

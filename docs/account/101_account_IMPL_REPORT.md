# 実装レポート: account (UI 非依存コア)

## 実装日時
2026-05-23 18:07 (JST)

## モード
feature — **UI 非依存の設定・削除ドメインロジックのみ実装**。React sections/modals/hooks + Sentry reconfigure + RPC/purge は app bootstrap フェーズへ defer。

## 関連ドキュメント
- [001_account_SPEC.md](./001_account_SPEC.md) / [002_account_PLAN.md](./002_account_PLAN.md) / [003_account_UNIT_TEST.md](./003_account_UNIT_TEST.md)
- [AI_LOG](../AI_LOG/D20260523_034_tdd_account.md)

## 変更一覧

### 実装 (純ロジック + DI)
- `src/features/account/errors.ts` (新規): `AccountError` / `AlreadyDeletedError` / `NotPendingDeletionError`。
- `src/features/account/settings.ts` (新規): `validateLocationPrecision` (precise/coarse/off) + `deriveAiConsentChange` (toggle→revoked_at/consentLog) + `isAiConsentActive`。
- `src/features/account/deletion.ts` (新規): `sanitizeDeletionReason` (trim 500) + `isPurgeEligible` (grace 30日 gte 境界) + `requestAccountDeletion`/`cancelAccountDeletion` (state 遷移 + AlreadyDeleted/NotPending、AccountDeletionStore DI)。
- `src/features/account/index.ts` (新規): barrel。

## 実装計画からの差分

| 項目 | 内容 |
|------|------|
| 計画にない追加変更 | 削除フローを AccountDeletionStore DI + 純判定 (isPurgeEligible) に切り出し。 |
| 計画から省略した変更 | **defer (app bootstrap)**: `useUserSettings` hook + optimistic/rollback (UT-AC-H01〜H04)、React sections/modals/gate (UT-AC-S/D/G + L/AI/P の UI 部)、Sentry reconfigure (UT-AC-P01 副作用)、実 RPC + `purge-deleted-users` の Storage/DB 削除 (UT-AC-PG04/PG05、RLS UT-AC-E01/E02)。 |
| 想定外の問題と対処 | 削除 grace 判定を `isPurgeEligible(deletedAt, now, graceDays)` の純関数化 (fake timers 不要でテスト deterministic、30日 gte 境界 PG02/B01 を直接検証)。 |

## PR Description

### タイトル
account: 設定・削除ドメインロジック (location 精度 + AI 同意 + 削除 grace)

### 概要
アカウント設定機能のうち UI 非依存のロジック (位置情報精度検証、AI 同意トグル導出、削除理由 sanitize、purge 適格判定 30日境界、削除予約/取消の state 遷移) を実装。React 設定 UI + RPC + purge cron は app bootstrap フェーズへ。

### テスト
- 16 tests pass、account 行 98.59% / 分岐 95.65% (settings/deletion/errors 100%)
- 全体 300/300 pass、typecheck clean

---

## 追記: Phase 3.5 Milestone C — 設定画面 + アカウント削除確認 presentation (2026-05-24, `/flow:auto` D20260524_051 反復8)

deferred 済の設定 UI を実装 (settings/deletion ロジックは実装済を compose、確立 pattern)。

### 追加ファイル (src/features/account/)
- `pages/SettingsPage.tsx` (新規): 5 節 (アカウント/位置情報精度/AI 同意/プライバシー/データ管理)。`validateLocationPrecision`/`deriveAiConsentChange`/`isAiConsentActive` を消費。`onUpdateSettings(patch)` 注入 seam。guest link CTA は `OAuthRequiredModal` 再利用。`SettingsView`/`SettingsPatch` を narrowed 注入契約として導入。
- `components/DeleteAccountDialog.tsx` (新規): **2 段階 irreversible 確認** (step1 警告+件数+「削除を予約」→ step2 理由 textarea + 承認 checkbox → 「確認しました、削除します」)。one-click 不可 (gate)。`onDeleteAccount(reason)` 注入 seam、`sanitizeDeletionReason` 適用。匿名 user は削除節非表示 (先に連携)。
- `index.ts` (追記) / `App.tsx` (`/settings` + `/account/settings` route)。

### 設計判断 (seam)
- settings 保存・削除は注入 seam (実 `user_settings` upsert / `consent_logs` / `requestAccountDeletion` は app/db 層)。App.tsx は no-op (token 配線待ち)。
- logic ファイル (settings/deletion/errors) 無改変。

### テスト結果
- 新規 2 file / +27 tests (SettingsPage 17 / DeleteAccountDialog 10)。
- 全体 **788/788 pass** (was 761)、typecheck 0 / eslint 0。

### 残 (browser 実機検証 + app 層配線)
- 実 settings 永続化 / 削除 grace + signOut / OAuth link round-trip。
- toggle スイッチの視覚 (Tailwind absolute thumb)。
- `onUpdateSettings`/`onDeleteAccount`/`isLinked`/`settings` の app 層配線。UC5 (30日 grace gate / DeletionPendingGate) は別 phase。各 004 E2E (`docs/E2E_GATE_STATUS_20260524.md`)。

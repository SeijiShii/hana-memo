# 実装レポート: legal (UI 非依存コア)

## 実装日時
2026-05-23 18:04 (JST)

## モード
feature — **UI 非依存の同意ドメインロジックのみ実装**。React component (InitialConsent/ReConsent/LegalPage) / hook / Markdown render / 実 DB INSERT は app bootstrap フェーズへ defer。

## 関連ドキュメント
- [001_legal_SPEC.md](./001_legal_SPEC.md) / [002_legal_PLAN.md](./002_legal_PLAN.md) / [003_legal_UNIT_TEST.md](./003_legal_UNIT_TEST.md) / [004_legal_E2E_TEST.md](./004_legal_E2E_TEST.md)
- [AI_LOG](../AI_LOG/D20260523_033_tdd_legal.md)

## 変更一覧

### 実装 (純ロジック + DI)
- `src/features/legal/errors.ts` (新規): `ConsentError`。
- `src/features/legal/versions.ts` (新規): `LATEST_VERSIONS` + `parseSemver` + `compareVersion` + `needsReConsent` (古い/欠落/形式不正→安全側で再同意要、cookie_policy=null は対象外)。
- `src/features/legal/consent.ts` (新規): `validateConsentInput` (doc_version null/形式不正 reject) + `buildConsentRecords` (ip_hash 透過) + `deriveLatestConsents` (agreedAt 最新採用) + `recordConsents` (ConsentStore DI)。
- `src/features/legal/index.ts` (新規): barrel。

## 実装計画からの差分

| 項目 | 内容 |
|------|------|
| 計画にない追加変更 | 同意判定を純関数 + ConsentStore DI に切り出し (semver 再同意判定をアプリ定数ベースで実装)。 |
| 計画から省略した変更 | **defer (app bootstrap)**: `InitialConsent`/`ReConsent`/`LegalPage` React component (UT-LE-I/R/P)、`useConsentStatus`/`useLatestVersions` hook + localStorage キャッシュ (UT-LE-H01〜H03)、Markdown レンダリング + XSS sanitize (UT-LE-P02、DOMPurify)、実 DB INSERT + retry (UT-LE-A03/E01/E02)。 |
| 想定外の問題と対処 | ip_hash は `_shared/helpers/id.ts hashIp` (実装済) を呼び出し側で計算 → buildConsentRecords に渡す設計 (純度維持)。静的法務文書 (privacy_policy.md 等) は既存で揃っており、レンダリングのみ defer。 |

## PR Description

### タイトル
legal: 同意ドメインロジック (semver 再同意判定 + consent record 構築・検証)

### 概要
法務同意機能のうち UI 非依存のロジック (文書バージョン管理、改訂時の再同意判定、consent_logs レコード構築・検証・最新導出) を実装。React 同意 UI + 静的ページレンダリング + DB wiring は app bootstrap フェーズへ。

### テスト
- 22 tests pass、legal 行 98.86% / 分岐 94.59% (errors/versions 100%、consent 100% line)
- 全体 284/284 pass、typecheck clean

---

## 追記: Phase 3.5 Milestone C — 同意ゲート + 法務文書ビュー presentation (2026-05-24, `/flow:auto` D20260524_051 反復7)

deferred 済の React 同意 UI を実装 (consent/versions ロジックは実装済を compose、確立 pattern)。

### 追加ファイル (src/features/legal/)
- `components/ConsentGate.tsx` (新規): 起動時 overlay (`role=dialog`)。初回同意と再同意を同一 component で扱い、実 `needsReConsent(current, latest)` (versions.ts) で diff 判定 (reimplement せず)。`onConsent(diffs)` 注入。
- `components/ConsentCheckbox.tsx` (新規): 各文書同意 checkbox + 「全文を見る」`/legal/*` リンク。
- `pages/LegalPage.tsx` (新規): privacy/terms/ai-usage/特商法 の静的ビュー。本文は「（本文は公開前に確定）」placeholder (binding text 非捏造)。
- `docs.ts` (新規): `LEGAL_DOC_META` (version は `versions.ts LATEST_VERSIONS` 由来、constants 非重複) + section 見出し。PLAN の `react-markdown`/`?raw` は dep 未追加のため TS embed に置換。
- `index.ts` (追記) / `App.tsx` (`/legal/{privacy,terms,ai-usage,specified-commercial-transactions}` route)。

### 設計判断 (seam)
- **consent gate = overlay** (route ではない、SPEC UC1/UC4 起動時表示)。4 文書は public route。
- **永続化は `onConsent` 注入 seam** (consent_logs INSERT + localStorage は app/db 層 `recordConsents`)。gate は App.tsx 未 mount (token 配線待ち、後方互換 = 配線まで強制しない)。
- **SEC-004 Sentry/PII 開示**: privacy section「エラー監視（Sentry）への送信前 PII スクラブ」として明示。`LATEST_VERSIONS.privacy_policy=v1.1.0` (revise bump) で v1.0.0 同意者は再同意トリガ。
- logic ファイル (consent/versions/errors) 無改変。

### テスト結果
- 新規 3 file / +23 tests (ConsentCheckbox 5 / ConsentGate 12 / LegalPage 6)。
- 全体 **761/761 pass** (was 738)、typecheck 0 / eslint 0。

### 残 (公開前 + app 層配線)
- 法務本文の確定 (`react-markdown` + `docs/legal/*.md` 原本 wiring + 法務レビュー、特に Sentry/PII 節)。
- overlay の視覚 / focus-trap / キーボード完走 (E-LE-7) の実機確認。
- `<ConsentGate onConsent={recordConsents 配線} />` を auth/db token 取得後に mount。各 004 ジャーニー E2E (`docs/E2E_GATE_STATUS_20260524.md`)。

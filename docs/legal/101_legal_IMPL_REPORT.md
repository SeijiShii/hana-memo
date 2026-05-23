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

# legal ドキュメントインデックス

**最終更新**: 2026-05-24 21:14
**生成元**: /flow:feature legal + /flow:tdd (2026-05-23 コア) + /flow:auto 反復7 D20260524_051 (MS-C 同意 UI)
**状態**: 実装完了 (2026-05-24、同意ゲート overlay + 法務文書ビュー + routing 実装済。残 = 法務本文確定 + DB 配線)

<!-- auto-generated-start -->

## 機能概要
プラポリ / 利用規約 / 特商法表記 / AI 利用同意。同意ドメインロジック (semver 再同意判定 + consent record) 実装済。

## ファイル一覧（番号順）
| 番号 | ファイル | 種別 | 状態 | 最終更新 | 短い説明 |
|---|---|---|---|---|---|
| 001 | [001_legal_SPEC.md](./001_legal_SPEC.md) | SPEC | 完了 | 2026-05-22 | 4 UC、consent_logs append-only、ip_hash 保存 |
| 002 | [002_legal_PLAN.md](./002_legal_PLAN.md) | PLAN | 完了 | 2026-05-22 | Phase 4 分割 (静的→初回同意→改訂再同意→問合せ) |
| 003 | [003_legal_UNIT_TEST.md](./003_legal_UNIT_TEST.md) | UNIT_TEST | 完了 | 2026-05-22 | consent flow + semver 比較 + a11y 確認 |
| 004 | [004_legal_E2E_TEST.md](./004_legal_E2E_TEST.md) | E2E_TEST | 完了 | 2026-05-22 | 7 シナリオ (E-LE-1 〜 E-LE-7) |
| 101 | [101_legal_IMPL_REPORT.md](./101_legal_IMPL_REPORT.md) | IMPL_REPORT | 完了 (presentation 済) | 2026-05-24 | versions/consent コア + MS-C 同意ゲート/文書ビュー (ConsentGate/LegalPage) |
| 102 | [102_legal_UNIT_TEST_REPORT.md](./102_legal_UNIT_TEST_REPORT.md) | UNIT_TEST_REPORT | 完了 | 2026-05-23 | 22 tests / 行 98.86% / 分岐 94.59% |

## 法務書類原稿
| ファイル | バージョン | 説明 |
|---|---|---|
| [privacy_policy.md](./privacy_policy.md) | v1.0.0 | プライバシーポリシー |
| [terms_of_service.md](./terms_of_service.md) | v1.0.0 | 利用規約 |
| [specified_commercial_transactions.md](./specified_commercial_transactions.md) | v1.0.0 | 特商法表記 |
| [ai_usage_consent.md](./ai_usage_consent.md) | v1.0.0 | AI 利用同意 |

## サブフォルダ
| パス | 種別 | issue/slug | 状態 | 概要 | INDEX |
|---|---|---|---|---|---|
| [revise_sentry_disclosure_20260524](./revise_sentry_disclosure_20260524/) | revise (legal-required) | sentry-disclosure | 設計完了 (実装待機) | プラポリ §4 に Sentry PII スクラブ後送信を明記 (SEC-004 法務 TODO)、v1.0.0→v1.1.0 | [INDEX](./revise_sentry_disclosure_20260524/INDEX.md) |

## 関連
- 親 concept: `../concept.md` §9, §1.3.1 legal 行
- **依存**: `_shared/auth` (匿名 session), `_shared/db` (consent_logs), `_shared/helpers/id` (hashIp)
- **被依存**: `account` (設定画面での同意状況表示), `capture` (AI 同意の存在前提), `billing` (利用規約の存在前提)
- 関連論点: [論点-009] お問い合わせフォーム実装方針
- 実装コード (コア): `src/features/legal/{errors,versions,consent,index}.ts`
- 実装コード (presentation, Phase 3.5 Milestone C): `src/features/legal/components/{ConsentGate,ConsentCheckbox}.tsx` + `pages/LegalPage.tsx` + `docs.ts` + `App.tsx` /legal/* route
- 残 (公開前 + 配線): 法務本文確定 (react-markdown + docs/legal/*.md 原本 + 法務レビュー) / ConsentGate の app mount + `recordConsents` 配線 / overlay 実機 a11y
- defer (app bootstrap): InitialConsent/ReConsent/LegalPage React component / useConsentStatus hook / Markdown render + DOMPurify / ConsentStore Drizzle 実装

## AI アクセスガイド
- 機能概要 → README.md
- 同意 UI 詳細 → 001_legal_SPEC.md §1
- 改訂時の対応 → 001_legal_SPEC.md UC4 + 003_legal_UNIT_TEST.md §1.6
- 書類本文 → privacy_policy.md / terms_of_service.md / specified_commercial_transactions.md / ai_usage_consent.md

## 機能性質タグ
- target_type: feature
- auth-required (匿名でも可)
- stateful (consent_logs append-only)

<!-- auto-generated-end -->

<!-- user-edit-start -->
<!-- user-edit-end -->

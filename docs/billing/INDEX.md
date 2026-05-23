# billing ドキュメントインデックス

**最終更新**: 2026-05-23 18:16
**生成元**: /flow:feature billing + /flow:tdd (2026-05-23、UI 非依存コア)
**状態**: コア実装完了 (2026-05-23、Stripe SDK / Vercel handler / React UI は app bootstrap defer)

<!-- auto-generated-start -->

## 機能概要
PWYW + content-unlock 課金 (Stripe Checkout) — AI 枠 ¥100/20 回 + PDF unlock PWYW (¥500 デフォルト) + 月次収益エクスポート。価格検証/webhook べき等性/収益集計 実装済。

## ファイル一覧（番号順）
| 番号 | ファイル | 種別 | 状態 | 最終更新 | 短い説明 |
|---|---|---|---|---|---|
| 001 | [001_billing_SPEC.md](./001_billing_SPEC.md) | SPEC | 完了 | 2026-05-22 | 5 UC、Stripe Checkout + Webhook、収益エクスポート (§4.6.4.1) |
| 002 | [002_billing_PLAN.md](./002_billing_PLAN.md) | PLAN | 完了 | 2026-05-22 | Phase 4 分割、Edge Function 3 種、private-exports bucket |
| 003 | [003_billing_UNIT_TEST.md](./003_billing_UNIT_TEST.md) | UNIT_TEST | 完了 | 2026-05-22 | べき等性 + 署名検証 + CSV カラム検証 |
| 004 | [004_billing_E2E_TEST.md](./004_billing_E2E_TEST.md) | E2E_TEST | 完了 | 2026-05-22 | 10 シナリオ (E-BL-1〜10、Stripe test mode、べき等性 critical) |
| 101 | [101_billing_IMPL_REPORT.md](./101_billing_IMPL_REPORT.md) | IMPL_REPORT | コア完了 | 2026-05-23 | pricing/webhook/revenue 実装、Stripe SDK/UI defer |
| 102 | [102_billing_UNIT_TEST_REPORT.md](./102_billing_UNIT_TEST_REPORT.md) | UNIT_TEST_REPORT | 完了 | 2026-05-23 | 19 tests / 行 99.21% / 分岐 97.77% |

## サブフォルダ
| パス | 種別 | issue/slug | 状態 | 概要 | INDEX |
|---|---|---|---|---|---|
| (なし) |

## 関連
- 親 concept: `../concept.md` §1.1 UC3, §1.3.1 billing 行, §4.6.4, §4.6.4.1, charter §1
- **依存**: `_shared/auth` (OAuth 必須), `_shared/db` (billing_unlocks + users 拡張), `_shared/ai` (quota 連携), `account` (履歴 UI 組込)
- **被依存**: `capture` (quota 確認), `export` (pdf_unlock 確認)
- 関連論点: [論点-010] 規模拡大時の集計運用
- 実装コード (コア): `src/features/billing/{errors,pricing,webhook,revenue,index}.ts`
- defer (app bootstrap): create-checkout-session/stripe-webhook Vercel Function (Stripe SDK+署名検証) / useAiCredits・usePdfUnlocked hook / checkoutApi / successConfirm / OAuthRequiredModal / export-revenue 実 Storage+Slack

## AI アクセスガイド
- 機能概要 → README.md
- AI 枠購入 → 001_billing_SPEC.md UC1
- PDF unlock PWYW → 001_billing_SPEC.md UC2
- 収益エクスポート → 001_billing_SPEC.md UC5 + concept §4.6.4.1
- べき等性検証 → 004_billing_E2E_TEST.md E-BL-7

## 機能性質タグ
- target_type: feature
- auth-required (OAuth 必須)
- external-api (Stripe)
- stateful (billing_unlocks append-only)

<!-- auto-generated-end -->

<!-- user-edit-start -->
<!-- user-edit-end -->

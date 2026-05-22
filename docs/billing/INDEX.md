# billing ドキュメントインデックス

**最終更新**: 2026-05-22 15:45
**生成元**: /flow:feature billing

<!-- auto-generated-start -->

## 機能概要
PWYW + content-unlock 課金 (Stripe Checkout) — AI 枠 ¥100/20 回 + PDF unlock PWYW (¥500 デフォルト) + 月次収益エクスポート。

## ファイル一覧（番号順）
| 番号 | ファイル | 種別 | 状態 | 最終更新 | 短い説明 |
|---|---|---|---|---|---|
| 001 | [001_billing_SPEC.md](./001_billing_SPEC.md) | SPEC | 完了 | 2026-05-22 | 5 UC、Stripe Checkout + Webhook、収益エクスポート (§4.6.4.1) |
| 002 | [002_billing_PLAN.md](./002_billing_PLAN.md) | PLAN | 完了 | 2026-05-22 | Phase 4 分割、Edge Function 3 種、private-exports bucket |
| 003 | [003_billing_UNIT_TEST.md](./003_billing_UNIT_TEST.md) | UNIT_TEST | 完了 | 2026-05-22 | べき等性 + 署名検証 + CSV カラム検証 |
| 004 | [004_billing_E2E_TEST.md](./004_billing_E2E_TEST.md) | E2E_TEST | 完了 | 2026-05-22 | 10 シナリオ (E-BL-1〜10、Stripe test mode、べき等性 critical) |

## サブフォルダ
| パス | 種別 | issue/slug | 状態 | 概要 | INDEX |
|---|---|---|---|---|---|
| (なし) |

## 関連
- 親 concept: `../concept.md` §1.1 UC3, §1.3.1 billing 行, §4.6.4, §4.6.4.1, charter §1
- **依存**: `_shared/auth` (OAuth 必須), `_shared/db` (billing_unlocks + users 拡張), `_shared/ai` (quota 連携), `account` (履歴 UI 組込)
- **被依存**: `capture` (quota 確認), `export` (pdf_unlock 確認)
- 関連論点: [論点-010] 規模拡大時の集計運用
- 実装コード: `src/features/billing/`, `supabase/functions/{create-checkout-session,stripe-webhook,export-revenue}/`

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

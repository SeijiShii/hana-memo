# billing 単体テスト計画

> **入力**: `./001_billing_SPEC.md`, `./002_billing_PLAN.md`
> **最終更新**: 2026-05-22

---

## 1. テストケース

### 1.1 create-checkout-session Edge Function
| ID | シナリオ | 期待 |
|---|---|---|
| UT-BL-CS01 | type=ai_credits, qty=1 | Stripe Session 作成 (line_items.price=price_ai_credits_20, qty=1) |
| UT-BL-CS02 | type=ai_credits, qty=10 | qty=10 |
| UT-BL-CS03 | type=ai_credits, qty=11 | reject (max 10) |
| UT-BL-CS04 | type=pdf_unlock | custom_unit_amount で session 作成 |
| UT-BL-CS05 | type=pdf_unlock + amount=50 | reject (min 100) |
| UT-BL-CS06 | 匿名 user | 401 + 「OAuth 必須」 |
| UT-BL-CS07 | Stripe API err | 500 + retry 1 |

### 1.2 stripe-webhook Edge Function
| ID | シナリオ | 期待 |
|---|---|---|
| UT-BL-WH01 | checkout.session.completed (ai_credits, qty=2) | billing_unlocks INSERT + users.ai_credits_remaining += 40 |
| UT-BL-WH02 | checkout.session.completed (pdf_unlock) | billing_unlocks INSERT + users.pdf_unlocked=true |
| UT-BL-WH03 | 同 session_id で 2 回受信 | 2 件目は UNIQUE 制約で reject (べき等性) |
| UT-BL-WH04 | 署名不一致 | 401 + Sentry |
| UT-BL-WH05 | 不明 event type | 200 (ignore) |
| UT-BL-WH06 | metadata.user_id 欠落 | 400 + Sentry |
| UT-BL-WH07 | DB INSERT 失敗 | Sentry alert + 500 (Stripe が retry) |

### 1.3 useAiCredits / usePdfUnlocked
| ID | シナリオ | 期待 |
|---|---|---|
| UT-BL-H01 | 初回 mount | users.ai_credits_remaining 取得 |
| UT-BL-H02 | Realtime 更新通知 | 即 re-render (subscribe to users) |
| UT-BL-H03 | pdf_unlocked toggle | usePdfUnlocked が反応 |

### 1.4 checkoutApi
| ID | シナリオ | 期待 |
|---|---|---|
| UT-BL-A01 | createCheckout(ai, 1) | Edge Fn 呼出 + URL 取得 |
| UT-BL-A02 | createCheckout(pdf, 500) | 同 + custom amount |
| UT-BL-A03 | network err | reject + toast |

### 1.5 successConfirm
| ID | シナリオ | 期待 |
|---|---|---|
| UT-BL-SC01 | session_id で 1 秒以内に billing_unlocks fetch 成功 | 即 resolve |
| UT-BL-SC02 | 30 秒 poll 後も未受信 | reject + 「処理中、後ほど再表示」 |
| UT-BL-SC03 | 受信中で credits が増加した | resolve with new credits |

### 1.6 export-revenue Edge Function
| ID | シナリオ | 期待 |
|---|---|---|
| UT-BL-ER01 | 月内 billing_unlocks 10 件 | CSV 1 行集計 + Storage に保存 |
| UT-BL-ER02 | 件数 0 | CSV 0 件、Slack 通知「収益なし」 |
| UT-BL-ER03 | CSV カラム順序 | 仕様準拠 |
| UT-BL-ER04 | api_usage cost 集計 | external_api_cost が反映 |
| UT-BL-ER05 | gross_margin 計算 | (net_revenue - external_api_cost) / net_revenue |
| UT-BL-ER06 | Slack URL 未設定 | console.warn + 続行 |

### 1.7 OAuthRequiredModal
| ID | シナリオ | 期待 |
|---|---|---|
| UT-BL-OM01 | 匿名 user が billing 画面アクセス | modal 表示 + 「連携する」ボタン |
| UT-BL-OM02 | 「連携する」押下 | _shared/auth.linkGoogleIdentity 呼出 |

### 1.8 異常系・境界
| ID | 対象 | 条件 | 期待 |
|---|---|---|---|
| UT-BL-E01 | RLS 拒否: 他 user billing_unlocks select | 空 |
| UT-BL-E02 | users.ai_credits_remaining = -1 試行 | CHECK 制約で reject |
| UT-BL-B01 | 同時 Webhook 100 件 | 全 INSERT、users UPDATE はトランザクション内 incremental |

## 2. Mock 方針
| 対象 | 方針 |
|---|---|
| Stripe SDK | mock (Session / Webhook event を fixture で) |
| Supabase | mock |
| Stripe-Signature 検証 | テスト fixture key で動作確認 |
| Slack fetch | mock |
| Date.now | useFakeTimers |

## 3. カバレッジ目標
| 種別 | 目標 |
|---|---|
| 行 | 85% |
| 分岐 | 80% |
| Webhook (critical) | 95% |
| べき等性 | 100% (UT-BL-WH03) |

## 4. 実行環境
- vitest (フロント) + Deno test (Edge Fn)
- Stripe test mode の API key を CI secret で

## 5. 更新履歴
| 日付 | 変更概要 | 実行者 |
|---|---|---|
| 2026-05-22 | 初版作成 | /flow:feature |

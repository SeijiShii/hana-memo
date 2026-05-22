# AI_LOG セッション D20260522_013 — /flow:feature (billing)

**実行日時**: 2026-05-22 15:40 (+09:00)
**コマンド**: /flow:feature (連続設計モード、--auto)
**対象**: billing (feature、優先度 4)
**状態**: 完了
**含まれる decision**: D20260522-095 〜 D20260522-101

## 主要決定サマリ
| ID | テーマ | 採用 |
|---|---|---|
| D20260522-095 | 対象選定 | billing |
| D20260522-096 | タグ | feature / auth-required / external-api / stateful (billing_unlocks append) |
| D20260522-097 | 課金フロー | Stripe Checkout (Hosted) → success_url → Webhook で確実反映 (PaaS 簡素) |
| D20260522-098 | プロダクト構成 | AI 枠 ¥100/20 回 (固定価格 price_id) + PDF unlock PWYW (Stripe Customer-defined amount) |
| D20260522-099 | 課金前提条件 | OAuth リンク必須 (`_shared/auth` D20260522-058 整合) |
| D20260522-100 | 収益エクスポート (§4.6.4.1) | 月次 cron で billing_unlocks 集計 → CSV を `<root>/exports/revenue_<YYYYMM>.csv` 生成 + Slack 通知 |
| D20260522-101 | E2E_TEST 生成 | 生成 (Stripe test mode 利用) |

## Decisions

```yaml
- id: D20260522-095
  timestamp: 2026-05-22T15:40:00+09:00
  command: /flow:feature
  phase: Step 0.3
  question: 次の対象
  options: ["billing (recommended、UC3 課金、capture quota と連携)"]
  recommended: "billing"
  chosen: "billing"
  chosen_type: auto-recommended
  depends_on: [D20260522-094]
- id: D20260522-096
  timestamp: 2026-05-22T15:40:00+09:00
  command: /flow:feature
  phase: Step 2
  question: タグ
  options: ["feature + auth-required + external-api + stateful (recommended)"]
  recommended: 同上
  chosen: 同上
  chosen_type: auto-recommended
- id: D20260522-097
  timestamp: 2026-05-22T15:40:00+09:00
  command: /flow:feature
  phase: Step 3 Q1
  question: 課金フロー
  options:
    - "Stripe Checkout (Hosted page) + Webhook (recommended、PCI-DSS 自前対応不要)"
    - "Stripe Elements (自前 UI、PCI 対応負荷)"
    - "Lemon Squeezy (Merchant of Record、税対応楽だが手数料高)"
  recommended: 案 1
  chosen: 案 1
  chosen_type: auto-recommended
  depends_on: [D20260522-018]
  context: |
    Checkout は Stripe ホストの決済ページ → success_url で戻る → Webhook で確実な反映。
    フロント直接呼出は public key のみ、secret key は Edge Function に閉じ込め。
- id: D20260522-098
  timestamp: 2026-05-22T15:40:00+09:00
  command: /flow:feature
  phase: Step 3 Q2
  question: プロダクト構成 (Stripe Products)
  options:
    - "AI 枠 ¥100/20 回 固定価格 + PDF unlock PWYW (Customer-defined) (recommended)"
    - "全部 PWYW (UX 混乱)"
    - "全部固定 (charter §1 PWYW 不採用)"
  recommended: 案 1
  chosen: 案 1
  chosen_type: auto-recommended
  context: |
    Stripe Products:
      - prod_ai_credits_20 / price_ai_credits_20 (¥100, mode=payment)
      - prod_pdf_unlock / price_pdf_unlock_pwyw (custom_unit_amount, min ¥100, default ¥500, mode=payment)
- id: D20260522-099
  timestamp: 2026-05-22T15:40:00+09:00
  command: /flow:feature
  phase: Step 3 Q3
  question: 課金前提条件
  options:
    - "OAuth リンク必須 (recommended、匿名は購入不可、復旧手段ない)"
    - "匿名でも課金可 (リスク: device 喪失で履歴消失)"
  recommended: 案 1
  chosen: 案 1
  chosen_type: auto-recommended
  depends_on: [D20260522-058]
- id: D20260522-100
  timestamp: 2026-05-22T15:40:00+09:00
  command: /flow:feature
  phase: Step 3 Q4 (concept §4.6.4.1 連携)
  question: 収益エクスポート機構
  options:
    - "月次 cron で billing_unlocks 集計 → CSV を <root>/exports/revenue_<YYYYMM>.csv 生成 + Slack 通知 (recommended)"
    - "なし (商用 PJ で必須なので不採用)"
  recommended: 案 1
  chosen: 案 1
  chosen_type: auto-recommended
  depends_on: ["concept §4.6.4.1"]
  context: |
    CSV カラム: date,mrr,arr,arpu,paid_users,new_signups,churn_count,churn_rate,ltv,external_api_cost,gross_margin
    PWYW + content-unlock のため MRR は 0 (recurring なし)、代わりに net_revenue を主指標とする。
- id: D20260522-101
  timestamp: 2026-05-22T15:40:00+09:00
  command: /flow:feature
  phase: Step 6
  question: E2E_TEST 生成?
  options: ["生成 (recommended、Stripe test mode で UC3 全フロー)"]
  recommended: 生成
  chosen: 生成
  chosen_type: auto-recommended
```

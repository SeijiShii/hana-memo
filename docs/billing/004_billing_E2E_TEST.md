# billing E2E テスト計画

> **2026-05-22 E2E 自動化方針追補** (perspectives O33): 本 E2E_TEST の全シナリオは **Playwright で自動化** することを基本方針とする。人力テストは「自動化で代替不可」な以下の例外パターンのみ許容:
> 1. デバイス固有の物理的触感 (タッチパネル / 振動 / 触覚フィードバック)
> 2. 視覚微細差異 (フォント / カラー / アニメーション滑らかさ — Visual regression 自動化で代替可能なら自動化優先)
> 3. 本番デプロイ前の最終目視 (実環境最終チェック)
> 4. 法的要件確認 (特商法表記 / プライバシーポリシー文面の最終目視)
>
> 各シナリオ表で **(auto)** = Playwright 自動 / **(manual)** = 人力 (上記 1-4 のいずれかに該当する場合のみ) を明示する。本 PJ のシナリオは原則すべて (auto) で、(manual) は legal の §9 法務文面最終目視 + 本番前最終 smoke のみ。


> **入力**: `./001_billing_SPEC.md`, `./002_billing_PLAN.md`, `../concept.md` §1.1 UC3
> **最終更新**: 2026-05-22

---

## 1. E2E シナリオ (Playwright + Stripe test mode)

### Scenario E-BL-1: AI 枠購入 (UC1 happy path)
**前提**: OAuth user、ai_credits_remaining=0
1. capture quota 0 → QuotaModal の「課金する」ボタン
2. `/billing/ai-credits` に遷移、qty=1 (¥100, 20 回) 表示
3. 「購入」ボタン押下 → Stripe Checkout URL に redirect
4. Stripe test カード `4242 4242 4242 4242` で決済
5. success_url に redirect (`/billing/success?session_id=...`)
6. 「処理中...」表示後、5 秒以内に「20 回追加されました」表示
7. CreditsBadge が「AI 識別: 残 20 回」表示
8. billing_unlocks DB に INSERT 確認 (type=ai_credits, amount_jpy=100)
- **検証**: 全ステップ green、users 更新

### Scenario E-BL-2: PDF unlock PWYW (UC2)
**前提**: OAuth user、pdf_unlocked=false
1. export 画面で「PDF をアンロック」 → `/billing/pdf-unlock`
2. 金額 ¥500 入力 (デフォルト) → 「購入」
3. Stripe Checkout で決済
4. success → pdf_unlocked=true
5. export 画面で「PDF ダウンロード」ボタンが enabled
- **検証**: 1 回購入で永続アンロック

### Scenario E-BL-3: PWYW 最小金額バリデーション
1. PDF unlock 画面で ¥50 入力
2. 「最低 ¥100 です」エラー、ボタン disabled
- **検証**: クライアント側バリデーション

### Scenario E-BL-4: 匿名 user で billing アクセス → OAuth 誘導
**前提**: anonymous user
1. `/billing` アクセス
2. OAuthRequiredModal 表示
3. 「Google で連携」 → OAuth 完了 → billing 画面に戻る
- **検証**: 誘導動作

### Scenario E-BL-5: 決済キャンセル
1. AI 枠購入 → Stripe Checkout 画面で「キャンセル」
2. cancel_url に redirect (`/billing/cancel`)
3. billing_unlocks INSERT されていない
4. users.ai_credits_remaining 変化なし
- **検証**: キャンセル時無影響

### Scenario E-BL-6: 過去履歴閲覧 (UC3)
**前提**: user に billing_unlocks 3 件 seed
1. 設定 → 「購入履歴」
2. 3 件表示 (日時 / 種別 / 金額 / Stripe Receipt URL)
3. Receipt URL クリック → Stripe Hosted Receipt
- **検証**: 履歴正確性

### Scenario E-BL-7: Webhook 重複受信 (べき等性)
**前提**: Stripe Webhook 模擬送信 ツール (`stripe trigger checkout.session.completed`)
1. 同 session_id で 2 回 Webhook 送信
2. billing_unlocks INSERT は 1 件のみ (UNIQUE 制約)
3. users.ai_credits_remaining も 1 回分のみ加算
- **検証**: べき等性確保

### Scenario E-BL-8: Webhook 署名不一致
1. 不正な signature header で Webhook 送信
2. 401 返却 + DB 変更なし + Sentry alert
- **検証**: セキュリティ

### Scenario E-BL-9: 月次収益エクスポート (UC5)
**前提**: 前月 billing_unlocks 5 件 + api_usage cost あり
1. export-revenue Edge Fn を手動実行
2. Storage `private-exports/revenue_YYYYMM.csv` に保存
3. CSV をダウンロード → カラム順序確認
4. Slack に通知 (集計値) 受信
- **検証**: PII なし、集計値のみ

### Scenario E-BL-10: AI 枠消費フロー (capture 連携)
1. ai_credits_remaining=20 状態で撮影 → 1 回識別
2. ai_credits_remaining=19 に減算
3. ヘッダ CreditsBadge が「残 19 回」に即更新
- **検証**: capture との統合

## 2. テスト環境
- Playwright Chromium
- Stripe test mode (API key を CI secret)
- Supabase テスト environment
- Slack Webhook URL もテスト用チャンネル

## 3. データシード
| 種別 | 内容 |
|---|---|
| OAuth user A (linked) | E-BL-1, 2, 3, 5, 6, 10 |
| anonymous user B | E-BL-4 |
| user A billing_unlocks 3 件 | E-BL-6 |
| 前月 billing_unlocks + api_usage | E-BL-9 |

## 4. 成功基準
- 全 10 シナリオ green
- E-BL-7 (べき等性) と E-BL-8 (署名検証) critical

## 5. CI 連携
- E-BL-1, 4, 7, 8 critical-path として PR ごと
- 他 nightly (Stripe test mode コストはほぼゼロ)

## 6. 更新履歴
| 日付 | 変更概要 | 実行者 |
|---|---|---|
| 2026-05-22 | 初版作成 | /flow:feature |

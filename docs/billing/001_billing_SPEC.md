# billing 機能仕様書

> **役割**: AI 識別枠追加購入 + PDF エクスポートアンロック (PWYW) + 収益エクスポート (concept §4.6.4.1)
> **タグ**: feature / auth-required / external-api / stateful
> **最終更新**: 2026-05-22
> **入力アーティファクト**: `../concept.md` §1.1 UC3, §4.6.4, §4.6.4.1, charter §1, `../_shared/auth/001_auth_SPEC.md`

---

## 1. 詳細 UC

### UC 1: AI 識別クレジット追加購入 (¥100 / 20 回)
- **トリガー**: capture quota 0 時の課金画面 / 設定 / billing トップ画面
- **前提**: OAuth リンク済 (匿名 NG)、利用規約同意済
- **入力**: 数量 (デフォルト 1 = 20 回、最大 10 = 200 回 / 1 注文)
- **処理ステップ**:
  1. Edge Function `create-checkout-session` を呼出 (mode=payment, price_id, quantity)
  2. Stripe Checkout URL を返却
  3. ブラウザ遷移 → Stripe Hosted ページで決済
  4. success_url=`/billing/success?type=ai_credits&session_id={CHECKOUT_SESSION_ID}` に戻る
  5. (並行) Stripe Webhook `checkout.session.completed` → Edge Function `stripe-webhook` → billing_unlocks INSERT + users.ai_credits_remaining += 20*qty
  6. /billing/success で受領確認モーダル表示 + notebook に戻れる
- **出力**: billing_unlocks 1 行 (type=ai_credits, amount=¥100*qty, ...) + ai_credits_remaining 増加
- **代替フロー**: 決済キャンセル (cancel_url=`/billing/cancel`) → 元画面に戻る、billing_unlocks 未作成

### UC 2: PDF エクスポートアンロック (PWYW、最低 ¥100、デフォルト ¥500)
- **トリガー**: export 機能の「PDF をアンロック」ボタン
- **前提**: OAuth リンク済
- **入力**: 任意金額 (Stripe Customer-defined amount で実装)
- **処理ステップ**:
  1. Edge Function `create-checkout-session` (price_id=pwyw、`custom_unit_amount.preset=500_00`)
  2. Stripe Checkout → 戻り → Webhook
  3. billing_unlocks INSERT (type=pdf_unlock, amount=ユーザー指定)
  4. users.pdf_unlocked = true
- **出力**: 永続的に PDF export 可

### UC 3: 過去購入履歴閲覧
- **トリガー**: 設定 → 「購入履歴」リンク
- **処理**: billing_unlocks をユーザー自身の分を一覧表示
- **出力**: 日時 / 種別 / 金額 / Stripe Receipt URL (Hosted)

### UC 4: 残高表示 (capture / notebook ヘッダ常時)
- **処理**: useAiCredits hook で users.ai_credits_remaining 表示
- **出力**: 「AI 識別: 残 N 回」(常時 UI)

### UC 5: 収益エクスポート (concept §4.6.4.1)
- **トリガー**: pg_cron で月次自動 + Edge Function 手動実行
- **処理**:
  1. 前月の billing_unlocks 集計
  2. cost 集計 (api_usage マテビュー)
  3. CSV 生成 (`date,paid_users,new_signups,net_revenue,external_api_cost,gross_margin` 等)
  4. Supabase Storage `private-exports` バケットに `revenue_YYYYMM.csv` 保存
  5. Slack Webhook 通知 (件数 + 収益サマリ)
- **手動ダウンロード**: 設定 → 「収益ログ」(運営者のみ閲覧可、admin role)

## 2. 入出力

### 2.1 API
| メソッド | パス | 入力 | 出力 | 認証 |
|---|---|---|---|---|
| (Edge Function) `create-checkout-session` | POST | `{type, quantity?}` | `{checkout_url, session_id}` | JWT |
| (Edge Function) `stripe-webhook` | POST | Stripe event | 200 | 署名検証 |
| (Supabase) `from('billing_unlocks').select` | DB | (なし) | history[] | RLS |
| (Edge Function) `export-revenue` | cron | yyyymm | exports/revenue_<yyyymm>.csv | service_role |

### 2.2 画面入力
| 画面 | フィールド | 必須 | 説明 |
|---|---|---|---|
| AI 購入 | 数量 | ✅ | 1-10、合計金額自動算出 |
| PDF unlock | 金額 | ✅ | 最低 ¥100、推奨 ¥500、最大 ¥10000 |

### 2.3 副作用
- DB 書込: billing_unlocks (INSERT, Webhook 経由), users (UPDATE: ai_credits_remaining, pdf_unlocked)
- 外部: Stripe Checkout session 作成 / Webhook 受信
- Storage: revenue CSV (private bucket)
- 外部送信: Slack Webhook (月次集計通知)

## 3. データモデル
- 既存 `billing_unlocks` (`_shared/db`) — type / amount_jpy / stripe_checkout_session_id / stripe_payment_intent_id / created_at
- `users` に **追加カラム**: `ai_credits_remaining int default 0`, `pdf_unlocked bool default false`
- 新規 Storage bucket `private-exports` (admin role のみ access)

## 4. バリデーション + エラーケース

### 4.1 バリデーション
| 対象 | ルール | エラー |
|---|---|---|
| quantity (AI) | 1-10 整数 | reject |
| amount (PWYW) | 100-10000 整数 (yen) | reject |
| 認証 | OAuth identity 必須 | E-BL-002 |

### 4.2 エラーケース
| ID | 条件 | 対応 |
|---|---|---|
| E-BL-001 | Stripe API 失敗 | retry 1 回 → 失敗時「決済システムが応答しません」+ サポート連絡誘導 |
| E-BL-002 | 匿名 user で購入試行 | 「Google アカウント連携が必要です」モーダル + OAuth 誘導 |
| E-BL-003 | Webhook 重複受信 | session_id でべき等性確保 (UPSERT) |
| E-BL-004 | Webhook 署名不一致 | 401 + Sentry alert |
| E-BL-005 | success_url 戻り時の Webhook 未受信 (race) | 「処理中です」ローディング、5 秒ごとに billing_unlocks を poll、最大 30 秒待機 |
| E-BL-006 | 課金成功後の ai_credits_remaining UPDATE 失敗 | Sentry 緊急 alert + Webhook 再試行に任せる |
| E-BL-007 | PDF unlock 二重課金 | UI 側で disable + バックエンドで重複は INSERT (収益 OK)、UX 文言「既にアンロック済」 |

## 5. 機能固有 NFR + 既存機能連携

### 5.1 NFR
| 項目 | 目標値 | 根拠 |
|---|---|---|
| Checkout URL 取得 | < 1.5s | UX |
| success_url 戻り → 反映確認 | < 30s (Webhook 遅延込) | Stripe SLA |
| Webhook 処理 | < 3s | Stripe timeout は 30s だが余裕を |
| 月次収益 CSV 生成 | < 30s | cron |

### 5.2 連携
| 連携先 | 種別 | 依存内容 |
|---|---|---|
| `_shared/auth` | OAuth 必須確認 | isLinked() |
| `_shared/db` | INSERT/UPDATE | billing_unlocks, users |
| `_shared/ai` | quota 連携 | ai_credits_remaining を quota.ts で参照 |
| `_shared/analytics` | logApiUsage | Stripe API 呼出も api_usage に記録 |
| `account` | 設定画面組込 | 「購入履歴」「収益ログ (admin)」 |
| `capture` | quota check | UC1 課金後に capture 可能 |
| `export` | unlock 確認 | pdf_unlocked=true 必須 |

## 6. タグ別追加

### 6.1 認可 (auth-required)
- billing_unlocks INSERT は Webhook (service_role) のみ可、ユーザー直 INSERT 不可 (RLS)
- billing_unlocks SELECT は自分のみ (RLS)
- export-revenue Edge Function は admin role のみ呼出可能

### 6.2 状態遷移 (stateful)
- billing_unlocks は append-only (UPDATE/DELETE 禁止 RLS)
- users.ai_credits_remaining は減算で 0 まで (負数禁止 CHECK)

### 6.3 外部 API (external-api)
- Stripe API key (secret) は Edge Function env のみ、フロント露出禁止
- Webhook 署名検証必須 (Stripe-Signature header)

## 7. スコープ外
- サブスクリプション (recurring) → MVP は単発のみ
- 返金処理 → 個別対応 (Stripe Dashboard 手動)
- 法人請求書 → v2
- 多通貨 → 当面 JPY のみ
- インボイス制度 (適格請求書) → 課税事業者になる規模になってから

## 8. 未決事項

### [論点-010] 月次 cron で集計しきれない場合の運用
- **影響範囲**: §4.6.4.1 収益エクスポート
- **詰めるべき問い**: 規模拡大 (月数百件超) で集計遅延が出たら? BigQuery 連携 or Materialized View で対応?
- **判断期限**: 月 100 件超えたら判断
- **担当**: seiji

## 9. 更新履歴
| 日付 | 変更概要 | 実行者 |
|---|---|---|
| 2026-05-22 | 初版作成 | /flow:feature |

# account 機能仕様書

> **役割**: 設定画面 / OAuth リンク UI / プライバシー設定 / アカウント削除
> **タグ**: feature / auth-required / settings
> **最終更新**: 2026-05-22
> **入力アーティファクト**: `../concept.md` §1.3.1, `../_shared/auth/001_auth_SPEC.md`, `../legal/001_legal_SPEC.md`

---

## 1. 詳細 UC

### UC 1: 設定画面の閲覧
- **トリガー**: メイン画面右上「設定」アイコン押下、ルート `/account/settings`
- **前提**: 匿名でも OAuth でも閲覧可
- **入力**: なし
- **処理**: 自分の users + user_settings + identities + linked_at + 同意状況を fetch、section 並列表示
- **出力**: 6 section 表示 (アカウント / 位置情報精度 / AI 同意 / プライバシー / 法務情報 / データ管理)

### UC 2: Google OAuth リンク
- **トリガー**: 「アカウント」section の「Google で連携する」ボタン押下
- **前提**: 現在 anonymous user
- **処理**:
  1. linkGoogleIdentity() 呼出 (`_shared/auth`)
  2. Supabase Auth → Google OAuth redirect
  3. /auth/callback 戻り → handleOAuthCallback() → linked_at update
  4. 設定画面に戻り、「Google アカウント連携済」表示に変化
- **出力**: linked_at set + 表示更新
- **代替フロー**: 既に他 device で同 Google アカウント使用済 → E-AU-003 ガイダンス

### UC 3: 位置情報精度の変更
- **トリガー**: 「位置情報精度」section のラジオボタン
- **入力**: `precise (約 1m) / coarse (約 100m、default) / off (記録しない)`
- **処理**: user_settings.location_precision を update、以後の撮影時 capture が参照
- **出力**: 設定保存 (toast 表示)

### UC 4: AI 利用同意のトグル
- **トリガー**: 「AI 同意」section のスイッチ
- **入力**: ON / OFF
- **処理**:
  - OFF → ON: consent_logs に ai_usage v1.0.0 INSERT (再同意扱い)
  - ON → OFF: user_settings.ai_consent_revoked_at = now()
- **出力**: 設定保存 + 次回 capture 時に enforceAiConsent でブロック (OFF 時)

### UC 5: アカウント削除 (二段階確認 + grace period)
- **トリガー**: 「データ管理」section の「アカウント削除」ボタン
- **処理**:
  1. モーダル 1: 「30 日後に完全削除されます。それまでは復元可能です」+ 削除予定の data 件数表示 (discoveries N 件、画像 M 枚)
  2. 「削除を予約」ボタン → モーダル 2: 削除理由 textarea (任意) + 「確認しました、削除します」
  3. users.deleted_at = now() update + ログアウト
  4. ログイン時に毎回「削除予定です。取消しますか?」と「ログアウト」のみ選択可
  5. grace 期間中の取消で deleted_at = null
  6. 30 日経過後、cron Edge Function `purge-deleted-users` が auth.users.delete + 関連レコード/Storage 完全削除
- **出力**: deleted_at set、画面遷移

### UC 6: ログアウト
- **トリガー**: 「アカウント」section の「ログアウト」ボタン (OAuth user のみ表示)
- **処理**: supabase.auth.signOut → session 削除 → ログイン画面 (or 匿名 user 再生成)
- **匿名 user**: 「ログアウト」ボタンは表示しない (代わりに「Google で連携」のみ)

### UC 7: エラーレポート opt-in/out
- **トリガー**: 「プライバシー」section のスイッチ「品質改善への協力」
- **入力**: ON / OFF
- **処理**: user_settings.analytics_opt_in 更新、initSentry を即時 reconfigure

## 2. 入出力

### 2.1 API
| メソッド | パス | 入力 | 出力 | 認証 |
|---|---|---|---|---|
| (Supabase) `from('user_settings').upsert` | DB | UserSettings 部分 | 更新済 row | RLS |
| (Supabase RPC) `request_account_deletion(reason?: string)` | RPC | reason | inserted row | 認証 |
| (Supabase RPC) `cancel_account_deletion()` | RPC | (なし) | row 更新 | 認証 |
| (Edge Function) `purge-deleted-users` | cron | (なし) | 削除件数 | service_role |

### 2.2 画面入力
| 画面 | フィールド | 必須 | 説明 |
|---|---|---|---|
| 設定 / 位置情報精度 | ラジオ (precise/coarse/off) | ✅ | デフォルト coarse |
| 設定 / AI 同意 | スイッチ | ✅ | デフォルト ON (初回同意済) |
| 設定 / プライバシー / エラー協力 | スイッチ | ✅ | デフォルト OFF |
| 削除 modal 1 | 件数確認 | - | (info) |
| 削除 modal 2 | 削除理由 textarea | 任意 | フィードバック用 |

### 2.3 副作用
- DB 更新: `user_settings` (upsert), `users.deleted_at` (RPC)
- Storage: deletion cron が user の object を全削除
- Sentry: opt-in/out 切替時に reconfigure

## 3. データモデル
- `user_settings` (既存 `_shared/db` で定義): location_precision, ai_consent_revoked_at, analytics_opt_in
- `users` (既存): linked_at, deleted_at (本 SPEC で deleted_at 追加要)、deletion_reason

## 4. バリデーション + エラーケース

### 4.1 バリデーション
| 対象 | ルール | エラー |
|---|---|---|
| location_precision | 'precise'\|'coarse'\|'off' | reject |
| 削除理由 | 任意、最大 500 文字 | trim + 500 で切る |

### 4.2 エラーケース
| ID | 条件 | 対応 |
|---|---|---|
| E-AC-001 | OAuth redirect 失敗 | ガイダンスモーダル + 再試行 |
| E-AC-002 | 既に他 device で同 Google account link 済 | E-AU-003 文言「このアカウントは既に別のデバイスで使われています。」 |
| E-AC-003 | delete 中の操作 | 削除予約済の場合は「取消するか、削除を待つか」モーダル強制表示 |
| E-AC-004 | user_settings upsert 失敗 | toast「保存できませんでした」+ 元の値に戻す |
| E-AC-005 | RPC エラー (削除予約) | toast 表示 + console.error |

## 5. 機能固有 NFR + 既存機能連携

### 5.1 NFR
| 項目 | 目標値 | 根拠 |
|---|---|---|
| 設定画面初期表示 | < 1s | UX |
| toggle 反映 | < 500ms (optimistic update) | UX |
| OAuth redirect 往復 | < 5s | OAuth 標準 |

### 5.2 連携
| 連携先 | 種別 | 依存内容 |
|---|---|---|
| `_shared/auth` | 関数呼出 | linkGoogleIdentity, getIdentities, signOut |
| `_shared/db` | upsert | user_settings, users 更新 |
| `_shared/analytics/sentry` | reconfigure | analytics_opt_in 変化時 |
| `_shared/storage` | 削除 cron | purge 時に user 配下 object 削除 |
| `legal` | UI 組込 | 「法務情報」section に同意状況表示 |
| `capture` | enforce | ai_consent_revoked_at が set なら撮影画面で AI 識別不可 |
| `billing` | 表示 | アカウント情報に course 表示、unlocked 機能表示 |

## 6. タグ別追加

### 6.1 認可 (auth-required)
- 全 RPC は `auth.uid()` 必須
- 他 user の user_settings 操作不可 (RLS)

### 6.2 設定 (settings)
- 設定値は user_settings に集約 (将来追加カラムも同テーブル)

## 7. スコープ外
- 通知設定 (MVP は Web Push なし、`[論点-002]`)
- メール変更 (Google OAuth 側で管理)
- パスワード管理 (パスワードレス)
- 多言語切替 (MVP は日本語のみ)
- データエクスポート → `export` 機能で別途

## 8. 未決事項
- データ削除時のユーザーフィードバック (理由) を集計 → α 後判断
- 削除 grace 30 日が妥当か → 法務レビューで確認

## 9. 更新履歴
| 日付 | 変更概要 | 実行者 |
|---|---|---|
| 2026-05-22 | 初版作成 | /flow:feature |

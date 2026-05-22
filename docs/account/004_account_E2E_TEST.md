# account E2E テスト計画

> **入力**: `./001_account_SPEC.md`, `./002_account_PLAN.md`
> **最終更新**: 2026-05-22

---

## 1. E2E シナリオ (Playwright)

### Scenario E-AC-1: 設定画面の表示 (UC1)
**前提**: 同意済 anonymous user
1. メイン画面右上「設定」アイコン押下
2. `/account/settings` に遷移
3. 6 section が表示される (アカウント / 位置情報 / AI 同意 / プライバシー / 法務 / データ管理)
4. アカウント section に「Google で連携する」ボタンが表示、ログアウトは表示されない (匿名のため)
- **検証**: 各 section の見出し + 初期値の正確性

### Scenario E-AC-2: Google OAuth リンク (UC2、要 mock or 実 Google account)
**前提**: anonymous user で `/account/settings` 表示中
1. 「Google で連携する」押下
2. Google OAuth ページに redirect (Playwright で stub or 実 account login)
3. /auth/callback に戻り、redirect 完了
4. 設定画面に戻り「Google アカウント連携済 (xxx@gmail.com)」表示
5. linked_at が users テーブルに set されていることを Supabase API で確認
- **検証**: users.linked_at + identities に google 追加

### Scenario E-AC-3: 位置情報精度の変更 (UC3)
1. 「位置情報精度」section で `precise` ラジオ選択
2. 「精細な位置情報を記録します。プライバシーにご注意ください。」警告表示
3. user_settings.location_precision = 'precise' を DB で確認
4. `off` に変更 → 「以後の撮影で位置情報を記録しません」警告
5. user_settings 更新確認
- **検証**: 各値で DB が即時更新

### Scenario E-AC-4: AI 利用同意 OFF → capture 不可 (UC4)
1. AI 同意スイッチを OFF
2. 「以後 AI 識別を停止します。過去のデータは保持されます。」警告 + 確認モーダル
3. 確認で user_settings 更新
4. メイン画面に戻り、撮影ボタン押下
5. 「AI 識別が無効です。設定で同意してください」モーダル表示、撮影画面起動せず
- **検証**: capture 側との連携

### Scenario E-AC-5: アカウント削除 (UC5、grace period)
**前提**: OAuth user (deletion は OAuth user のみ可)
1. 「データ管理」section の「アカウント削除」押下
2. モーダル 1: 「discoveries N 件、画像 M 枚が 30 日後に削除されます」+ 「削除を予約」ボタン
3. 「削除を予約」押下
4. モーダル 2: 削除理由 textarea + 「確認しました、削除します」
5. 削除理由「テスト」と入力 → 「確認」押下
6. ログアウトされ、再度同 Google アカウントでログイン
7. アプリ起動時に DeletionPendingGate モーダル表示
8. 「削除を取消す」押下 → deleted_at = null
9. 設定画面に戻れることを確認
- **検証**: users.deleted_at / deletion_reason、DeletionPendingGate の表示、取消後の復旧

### Scenario E-AC-6: 削除 grace 完了 → 完全削除 (Edge Function 手動 trigger)
**前提**: deleted_at を 31 日前にセット (テスト用 SQL or short-grace env)
1. purge-deleted-users Edge Function を手動 trigger
2. auth.users が削除されていることを確認
3. public.users / discoveries / images / Storage object が全て削除
4. consent_logs は user_id = NULL でレコードが残存
- **検証**: 完全削除の網羅性 + 法務トレース性 (consent_logs 残存)

### Scenario E-AC-7: ログアウト (OAuth user)
1. OAuth user で「ログアウト」押下
2. signOut 呼出 → session 消失
3. アプリ再起動時に新たに anonymous user が生成される
- **検証**: session 完全クリア、新 anonymous user 生成

## 2. テスト環境
- Playwright Chromium
- Supabase テスト environment (本番分離)
- Google OAuth は Playwright で stub (実 account は CI で困難)

## 3. データシード
| 種別 | 内容 |
|---|---|
| anonymous user A (同意済) | E-AC-1, 2, 3, 4 |
| OAuth user B (linked) | E-AC-5, 6, 7 |

## 4. 成功基準
- 全 7 シナリオ green
- DB 状態が SPEC §1 と一致

## 5. CI 連携
- E-AC-1, 5, 6 は critical-path として PR ごと
- その他は nightly
- Edge Function purge は短縮 env で nightly

## 6. 更新履歴
| 日付 | 変更概要 | 実行者 |
|---|---|---|
| 2026-05-22 | 初版作成 | /flow:feature |

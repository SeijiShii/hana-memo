# capture E2E テスト計画

> **入力**: `./001_capture_SPEC.md`, `./002_capture_PLAN.md`, `../concept.md` §1.1 UC1
> **最終更新**: 2026-05-22

---

## 1. E2E シナリオ (Playwright)

### Scenario E-CA-1: 撮影 → 識別 → 一覧反映 (UC1 happy path)
**前提**: 同意済 anonymous user、quota 残あり、テスト用 fixture 画像 `tulip.jpg` を用意
1. メイン画面の「撮影」ボタン押下
2. Playwright で input file を fixture `tulip.jpg` で fulfill
3. PreviewPage に遷移、プレビュー画像表示
4. 「これでよい」押下
5. discoveries テーブルに row 1 件 (status=identifying) を Supabase API で確認
6. Storage 配下に `{user_id}/{discovery_id}/{image_id}.webp` が存在 (HEAD で 200)
7. 5 秒以内に discoveries.status=identified に更新される (Realtime or poll)
8. notebook 画面に遷移し、新規 discovery が一覧に表示
9. 「チューリップ」など common_name が表示
- **検証**: discoveries row 完全性 (scientific_name, family, confidence)、Storage object 残存、EXIF が strip されていること (Image-Magick で fixture と比較)

### Scenario E-CA-2: 撮影 → AI 失敗 → 再識別 (UC2)
**前提**: OpenAI API を fail 設定 (env で `OPENAI_API_KEY=invalid` 注入)
1. 撮影 → 「これでよい」
2. 5 秒以内に discovery.status='pending' になる
3. notebook で「再識別」ボタン表示確認
4. OpenAI API を正常設定に戻す
5. 「再識別」ボタン押下
6. 5 秒以内に identified に更新
- **検証**: status の遷移 (identifying → pending → identifying → identified)

### Scenario E-CA-3: 匿名 trial 超過 → OAuth 誘導
**前提**: anonymous user、trial_used_count=3 (DB seed)
1. 撮影ボタン押下
2. QuotaModal「3 回の体験は終了。続けるには Google アカウントを連携してください」表示
3. プレビュー画面に遷移せず
- **検証**: discovery INSERT が起きていない、UI が誘導モーダル

### Scenario E-CA-4: AI 同意 OFF → 撮影不可
**前提**: user_settings.ai_consent_revoked_at が set 済
1. 撮影ボタン押下
2. 「AI 識別が無効です。設定で同意してください」モーダル
3. 「設定へ」ボタン → /account/settings に遷移
- **検証**: discovery 作成されず

### Scenario E-CA-5: 位置情報精度=off で撮影
**前提**: user_settings.location_precision='off'
1. 撮影 → 「これでよい」
2. discoveries.location が NULL であることを確認
- **検証**: 位置情報が DB に保存されていない

### Scenario E-CA-6: 撮影プレビューで「撮り直し」
1. 撮影 → プレビュー → 「撮り直し」押下
2. CapturePage に戻る
3. discoveries INSERT 起きていない
- **検証**: 副作用なし

### Scenario E-CA-7: ネットワーク切断中の Storage upload 失敗
**前提**: Playwright で `context.setOffline(true)` を upload 直前に発動
1. 撮影 → 「これでよい」
2. 「保存に失敗しました。再試行してください」エラー表示
3. discovery 削除 (DB に残らない)
- **検証**: discoveries にゴミ row 残存しない、Storage に object なし

### Scenario E-CA-8: EXIF GPS strip 検証
1. fixture `with_gps_exif.jpg` (緯度経度埋込済) を撮影 input に fulfill
2. 「これでよい」 → upload 完了
3. Storage から object を fetch
4. exifr ライブラリで EXIF 解析
5. GPS タグが完全に存在しないことを assert
- **検証**: GPS タグ 0 件 (個情リスク防止)

## 2. テスト環境
- Playwright Chromium (iOS Safari の挙動は手動 smoke test)
- Supabase テスト environment
- OpenAI 実 API (E-CA-1 のみ、コスト想定 $0.003 × 1 = ほぼ無料)
- 他シナリオは Edge Function を mock 化

## 3. データシード
| 種別 | 内容 |
|---|---|
| anonymous user A | quota 残 10、同意済 |
| anonymous user B | trial_used_count=3 (E-CA-3 用) |
| user_settings B (ai_consent_revoked) | E-CA-4 用 |
| fixture images | tulip.jpg, with_gps_exif.jpg, large_8mb.jpg |

## 4. 成功基準
- 全 8 シナリオ green
- EXIF strip が確実 (E-CA-8 critical)
- 中断・失敗時に副作用なし (E-CA-6, E-CA-7)

## 5. CI 連携
- E-CA-1, 3, 4, 8 を critical-path として PR ごと
- E-CA-2, 5, 6, 7 は nightly

## 6. 更新履歴
| 日付 | 変更概要 | 実行者 |
|---|---|---|
| 2026-05-22 | 初版作成 | /flow:feature |

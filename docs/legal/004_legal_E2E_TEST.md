# legal E2E テスト計画

> **2026-05-22 E2E 自動化方針追補** (perspectives O33): 本 E2E_TEST の全シナリオは **Playwright で自動化** することを基本方針とする。人力テストは「自動化で代替不可」な以下の例外パターンのみ許容:
> 1. デバイス固有の物理的触感 (タッチパネル / 振動 / 触覚フィードバック)
> 2. 視覚微細差異 (フォント / カラー / アニメーション滑らかさ — Visual regression 自動化で代替可能なら自動化優先)
> 3. 本番デプロイ前の最終目視 (実環境最終チェック)
> 4. 法的要件確認 (特商法表記 / プライバシーポリシー文面の最終目視)
>
> 各シナリオ表で **(auto)** = Playwright 自動 / **(manual)** = 人力 (上記 1-4 のいずれかに該当する場合のみ) を明示する。本 PJ のシナリオは原則すべて (auto) で、(manual) は legal の §9 法務文面最終目視 + 本番前最終 smoke のみ。


> **入力**: `./001_legal_SPEC.md`, `./002_legal_PLAN.md`, `../concept.md` §4.5
> **最終更新**: 2026-05-22

---

## 1. E2E シナリオ (Playwright)

### Scenario E-LE-1: 初回起動 → 3 件同意 → メイン画面 (UC1)
**前提**: 新規ブラウザ context (localStorage 空、Cookie 空、Supabase anon user 未生成)
1. アプリ URL にアクセス
2. 起動時に匿名 Auth が自動実行され users 1 行 INSERT
3. InitialConsent モーダルが表示される (3 チェックボックス、ボタン disabled)
4. 「同意して始める」ボタンが disabled であることを確認
5. プラポリ checkbox ON → ボタンまだ disabled
6. 利用規約 checkbox ON → ボタンまだ disabled
7. AI 利用同意 checkbox ON → ボタン enabled
8. 「同意して始める」押下
9. consent_logs に 3 行 INSERT されたことを Supabase API で確認 (doc_type=privacy_policy/terms_of_service/ai_usage、doc_version=v1.0.0)
10. localStorage に `hanamemo_consent_versions` が保存されていることを確認
11. メイン画面 (カメラ画面) に遷移
- **検証**: ヘッダに同意関連 modal なし、カメラ画面の UI が表示される

### Scenario E-LE-2: フッタリンクから静的ページ閲覧 (UC2)
**前提**: 同意済 user で起動
1. メイン画面のフッタ「プライバシーポリシー」リンクを押下
2. `/legal/privacy` に遷移、ページタイトル「プライバシーポリシー v1.0.0」が表示される
3. 戻るボタンでメイン画面に戻る
4. 同様に「利用規約」「特商法表記」「お問い合わせ」「AI 利用同意」リンクを押下し、各ページが表示される
5. 「お問い合わせ」リンクは `[論点-009]` 解決後に検証 (現時点 PENDING タグ)
- **検証**: 各ページの h1 + リード文 + 最終更新日が表示される、404 にならない

### Scenario E-LE-3: 設定画面で同意状況確認 (UC3)
**前提**: 同意済 user
1. メイン画面右上「設定」アイコン押下
2. account 画面が表示される (`/account/settings`)
3. 「法務情報」セクションまでスクロール
4. 3 件の同意ログ (doc_type / doc_version / 同意日時 / 「再閲覧」リンク) が表示される
5. 「再閲覧」リンク押下 → `/legal/privacy` に遷移
- **検証**: 同意日時が ISO 8601 → ローカル時刻に正しく整形されている

### Scenario E-LE-4: 改訂時の再同意フロー (UC4)
**前提**: privacy_policy v1.0.0 で同意済 user。アプリ側 `LATEST_VERSIONS.privacy_policy = 'v1.1.0'` に bump 済 (テスト用にビルド時注入)
1. アプリにアクセス
2. ReConsent モーダルが表示される (privacy のみチェック、tos/ai_usage は表示されない)
3. 「v1.0.0 → v1.1.0 の主な変更点」セクションに差分要約が表示される
4. 「全文を見る」リンク押下 → 新タブで `/legal/privacy` 表示
5. モーダルに戻る → privacy checkbox ON → 「同意して続ける」押下
6. consent_logs に privacy_policy/v1.1.0 の 1 行 INSERT (旧 v1.0.0 行は残っている)
7. メイン画面に遷移
- **検証**: 旧 row も DB に残存、append-only 整合性

### Scenario E-LE-5: 同意拒否 (UC1 代替フロー)
**前提**: 新規 context
1. アプリにアクセス → InitialConsent モーダル表示
2. checkbox 全 OFF のまま modal の右上「閉じる (x)」押下
3. 「サービスを利用できません。同意がいただける場合は再度起動してください」モーダル表示
4. メイン画面には遷移しない
- **検証**: consent_logs に row なし、user_settings レコードなし、操作不能状態

### Scenario E-LE-6: localStorage 不可 (private mode 相当)
**前提**: Playwright で `context.addInitScript(() => { Object.defineProperty(window, 'localStorage', {get: () => { throw new Error('blocked'); }}); })` を仕込む
1. 同意済 user で起動
2. localStorage 例外が catch され、DB から consent_logs を毎回 fetch する
3. メイン画面が問題なく表示される
- **検証**: console.error なし (フォールバックは silent)

### Scenario E-LE-7: a11y キーボードのみで同意完了
**前提**: 新規 context
1. InitialConsent モーダルにフォーカスが自動移動
2. Tab で各 checkbox に移動 → Space で ON
3. 3 件全 ON 後、Tab でボタンに移動 → Enter で submit
4. consent_logs 3 件 INSERT 確認
- **検証**: マウスクリックなしで完了、スクリーンリーダーのラベル読み上げ可

## 2. テスト環境
- Playwright Chromium + WebKit + Firefox (PWA 対応確認も兼ねる)
- Supabase テスト environment (本番と分離、Free 枠別 project)
- テスト前後で consent_logs / users を seed reset

## 3. データシード
| 種別 | 内容 |
|---|---|
| anonymous user A | 同意済 v1.0.0 |
| anonymous user B | 未同意 (新規) |
| 改訂シミュレーション | env override `VITE_LEGAL_LATEST_VERSIONS={"privacy_policy":"v1.1.0",...}` |

## 4. 成功基準
- 全 7 シナリオ green
- consent_logs に予期外の row が混入しない
- E-LE-4 で append-only が保たれる (UPDATE/DELETE されない)

## 5. CI 連携
- main へのマージ前必須 (UC1, UC2, UC4 のみ critical-path として PR ごと、その他は nightly)
- 失敗時 Slack 通知 (concept §5.2 NFR 監視整合)

## 6. 更新履歴
| 日付 | 変更概要 | 実行者 |
|---|---|---|
| 2026-05-22 | 初版作成 | /flow:feature |

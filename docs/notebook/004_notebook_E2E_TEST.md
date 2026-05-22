# notebook E2E テスト計画

> **2026-05-22 E2E 自動化方針追補** (perspectives O33): 本 E2E_TEST の全シナリオは **Playwright で自動化** することを基本方針とする。人力テストは「自動化で代替不可」な以下の例外パターンのみ許容:
> 1. デバイス固有の物理的触感 (タッチパネル / 振動 / 触覚フィードバック)
> 2. 視覚微細差異 (フォント / カラー / アニメーション滑らかさ — Visual regression 自動化で代替可能なら自動化優先)
> 3. 本番デプロイ前の最終目視 (実環境最終チェック)
> 4. 法的要件確認 (特商法表記 / プライバシーポリシー文面の最終目視)
>
> 各シナリオ表で **(auto)** = Playwright 自動 / **(manual)** = 人力 (上記 1-4 のいずれかに該当する場合のみ) を明示する。本 PJ のシナリオは原則すべて (auto) で、(manual) は legal の §9 法務文面最終目視 + 本番前最終 smoke のみ。


> **入力**: `./001_notebook_SPEC.md`, `./002_notebook_PLAN.md`, `../concept.md` §1.1 UC2, §4.8.2
> **最終更新**: 2026-05-22

---

## 1. E2E シナリオ (Playwright)

### Scenario E-NB-1: タイムライン初期表示 (UC1)
**前提**: user A に 30 件 discovery seed
1. `/notebook` アクセス
2. 20 件カード表示確認
3. 下スクロール → 21-30 件目 追加表示
- **検証**: 30 件全件、descending order、画像表示

### Scenario E-NB-2: モード切替 (UC2)
1. タイムライン → カレンダー切替 → 当月マーカー表示
2. カレンダー → 地図 切替 → ピン表示 (location あるもののみ)
3. 地図 → 図鑑 切替 → 種別グループ
- **検証**: 各モード正しく表示、同データの 4 表現

### Scenario E-NB-3: フィルタ (UC3)
1. フィルタアイコン → 季節=春 + キーワード「桜」
2. URL に `?season=spring&q=桜` 反映
3. 該当 discovery のみ表示
4. URL を直接アクセスで状態復元
- **検証**: deep link 動作

### Scenario E-NB-4: 詳細編集 (UC4)
1. カードタップ → DiscoveryDetailPage
2. common_name を「タンポポ」に編集 → 「保存」
3. discoveries.user_overridden_name='タンポポ' を DB で確認
4. discovery_edits に row 1 件 (before=AI 値、after='タンポポ')
5. 一覧に戻る → 表示が「タンポポ」になっている
- **検証**: 編集履歴記録、表示の上書き優先

### Scenario E-NB-5: discovery 削除 (UC5)
1. 詳細画面 → 「削除」ボタン → 確認 modal → 「削除」
2. 一覧に戻る → 削除済 discovery が表示されない
3. discoveries.deleted_at が set されていることを DB 確認
- **検証**: soft delete、UI 反映

### Scenario E-NB-6: 月次コラージュ生成 + シェア (UC6、concept §4.8.2 連携)
**前提**: 前月に identified 9 件以上
1. notebook 上部「月次コラージュ」ボタン押下
2. 5 秒以内にコラージュ画像生成、プレビュー表示
3. 「シェア」押下 → Web Share API 起動 (Playwright で stub)
4. シェア URL に動的 OG 画像 endpoint が含まれる
- **検証**: 9 グリッド画像、シェア URL 有効

### Scenario E-NB-7: 強制シェア無し (charter §2.2 抵触チェック)
1. 全機能利用中
2. シェア未実行のまま全機能 (撮影 / 編集 / 削除 / コラージュ閲覧) が使える
3. シェアモーダルが強制表示されない (CapturePage / DetailPage / CollagePage の全 modal を grep してアサート)
- **検証**: charter §2.2 OK ライン「シェアしなくても全機能使える」

### Scenario E-NB-8: 再識別 (UC7)
**前提**: pending discovery 1 件
1. 一覧で「再識別」ボタン押下
2. status=identifying → 結果反映 (E2E ではモック OK)
- **検証**: capture/retryIdentify との統合

### Scenario E-NB-9: discovery_edits 改竄不可
1. test DB 直接 SQL で `UPDATE discovery_edits SET ... WHERE ...` 試行
2. RLS で拒否される
- **検証**: append-only RLS

### Scenario E-NB-10: a11y (キーボードのみ閲覧)
1. キーボード Tab で各カードに移動 → Enter で詳細
2. 編集フィールドへの移動 + 保存
- **検証**: マウス不要操作可能

## 2. テスト環境
- Playwright Chromium + WebKit (Web Share API は WebKit で先行サポート)
- Supabase テスト environment

## 3. データシード
| 種別 | 内容 |
|---|---|
| user A 30 件 discoveries | E-NB-1, 2, 3 |
| user A 9+ 件 identified 前月分 | E-NB-6 |
| user A 1 件 pending | E-NB-8 |

## 4. 成功基準
- 全 10 シナリオ green
- E-NB-7 critical (charter §2.2 抵触なし)
- E-NB-9 critical (append-only)

## 5. CI 連携
- E-NB-1, 4, 5, 7, 9 critical-path として PR ごと
- 他 nightly

## 6. 更新履歴
| 日付 | 変更概要 | 実行者 |
|---|---|---|
| 2026-05-22 | 初版作成 | /flow:feature |

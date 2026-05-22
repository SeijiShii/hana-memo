# export E2E テスト計画

> **2026-05-22 E2E 自動化方針追補** (perspectives O33): 本 E2E_TEST の全シナリオは **Playwright で自動化** することを基本方針とする。人力テストは「自動化で代替不可」な以下の例外パターンのみ許容:
> 1. デバイス固有の物理的触感 (タッチパネル / 振動 / 触覚フィードバック)
> 2. 視覚微細差異 (フォント / カラー / アニメーション滑らかさ — Visual regression 自動化で代替可能なら自動化優先)
> 3. 本番デプロイ前の最終目視 (実環境最終チェック)
> 4. 法的要件確認 (特商法表記 / プライバシーポリシー文面の最終目視)
>
> 各シナリオ表で **(auto)** = Playwright 自動 / **(manual)** = 人力 (上記 1-4 のいずれかに該当する場合のみ) を明示する。本 PJ のシナリオは原則すべて (auto) で、(manual) は legal の §9 法務文面最終目視 + 本番前最終 smoke のみ。


> **入力**: `./001_export_SPEC.md`, `./002_export_PLAN.md`
> **最終更新**: 2026-05-22

---

## 1. E2E シナリオ (Playwright)

### Scenario E-EX-1: CSV ZIP エクスポート (UC2)
**前提**: user A に 10 件 discoveries + 5 件 edits + 3 件 consent + 1 件 billing
1. 設定 → 「全データを CSV」押下
2. ZIP ファイルが DL される (`hanamemo_export_*.zip`)
3. ZIP を展開 → 4 つの CSV (discoveries.csv 10 行 + ヘッダ、etc.)
4. CSV を Excel で開く → 日本語が文字化けしない (BOM 検証)
- **検証**: 全 4 ファイル整合、文字コード OK

### Scenario E-EX-2: JSON エクスポート (UC3)
1. 設定 → 「全データを JSON」
2. .json ファイル DL
3. JSON parse → 構造に discoveries, edits, consent_logs, billing_unlocks
- **検証**: structure 正確

### Scenario E-EX-3: PDF unlock なしで誘導
**前提**: pdf_unlocked=false
1. 設定 → 「PDF ダウンロード」
2. PdfUnlockGate 表示「アンロック (¥500 PWYW)」
3. 押下 → `/billing/pdf-unlock` 遷移
- **検証**: billing 連携

### Scenario E-EX-4: PDF unlock 済で生成 (UC1)
**前提**: pdf_unlocked=true, discoveries 16 件 identified
1. /export/pdf アクセス
2. プレビュー表示 (表紙 + 4 ページ + 統計)
3. 「PDF ダウンロード」 → 30 秒以内に DL
4. PDF を開く → 17 ページ (表紙 + 4 grid 4 ページ + 統計 1)、画像表示
- **検証**: ページ数、画像埋込

### Scenario E-EX-5: PDF 件数上限 (UC1 境界)
**前提**: 201 件 discoveries
1. /export/pdf でフィルタ全期間
2. 「201 件は上限超過、200 件以下に絞ってください」エラー
- **検証**: バリデーション動作

### Scenario E-EX-6: 画像 ZIP DL (UC4)
**前提**: 100 件画像 (avg 500KB)
1. 設定 → 「画像を ZIP」押下
2. プログレスバー表示 (0% → 100%)
3. 60 秒以内に DL
4. ZIP 展開 → 100 件画像 (webp)
- **検証**: プログレス動作、全画像取得

### Scenario E-EX-7: 画像 ZIP 中断 (UC4 cancel)
1. ZIP DL 開始 → 30 件目で cancel
2. プログレス停止 + DL なし
- **検証**: 中断機能

### Scenario E-EX-8: 削除予約 user は export 不可
**前提**: deleted_at set 済 user
1. /export アクセス
2. 全ボタン disabled + 「削除予定です。取消後にエクスポートできます」
- **検証**: ガード動作

### Scenario E-EX-9: 撤退時データ持出し (§4.7.5 連携 happy path)
**前提**: サービス撤退想定、user が全データ持出し
1. CSV + JSON + 画像 ZIP を順次 DL
2. ローカルで全データ復元可能 (画像とメタ突合)
- **検証**: 撤退時に user が独立可能

## 2. テスト環境
- Playwright Chromium
- Supabase テスト environment

## 3. データシード
| 種別 | 内容 |
|---|---|
| user A | 10 件 discoveries + 関連 |
| user B (pdf_unlocked) | 16 件 identified |
| user C (削除予約) | E-EX-8 |
| user D (大量) | 201 件 + 100 画像 |

## 4. 成功基準
- 全 9 シナリオ green
- 文字化けなし (E-EX-1 critical)
- 撤退時持出し OK (E-EX-9 critical、§4.7.5 整合)

## 5. CI 連携
- E-EX-1, 3, 4, 8 critical-path として PR ごと
- 他 nightly

## 6. 更新履歴
| 日付 | 変更概要 | 実行者 |
|---|---|---|
| 2026-05-22 | 初版作成 | /flow:feature |

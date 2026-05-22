# notebook 機能仕様書

> **役割**: 発見の閲覧・編集・振り返り (UC2、4 モード表示 + 編集 + UGC シェア)
> **タグ**: feature / auth-required
> **最終更新**: 2026-05-22
> **入力アーティファクト**: `../concept.md` §1.1 UC2, §4.8.2, `../capture/001_capture_SPEC.md`

---

## 1. 詳細 UC

### UC 1: タイムライン閲覧 (default 表示)
- **トリガー**: アプリ起動後 or フッタの「ノート」アイコン
- **前提**: 認証済
- **入力**: なし
- **処理**: 自分の discoveries を captured_at 降順で 20 件ずつ無限スクロール、image を署名 URL で表示
- **出力**: discovery カードリスト (画像サムネ + common_name + 撮影日時 + 場所概略)

### UC 2: モード切替 (タイムライン / カレンダー / 地図 / 図鑑)
- **トリガー**: 画面上部のモードタブ
- **モード詳細**:
  - **タイムライン**: 撮影日時降順、スクロール
  - **カレンダー**: 月表示、撮影日にマーカー、タップで当日の discovery 一覧
  - **地図**: discoveries の location をピン表示 (location null は除外)、ピンタップで詳細
  - **図鑑**: scientific_name 別にグルーピング、サムネタイル
- **出力**: 各モードで同じ discovery データを別ビューで表示

### UC 3: フィルタ
- **トリガー**: 画面右上のフィルタアイコン
- **入力**:
  - 季節: 春 / 夏 / 秋 / 冬 / 全て (デフォルト)
  - 月: yyyy-mm or 範囲
  - ステータス: identified / pending / unknown / 全て
  - 場所円: 中心点 + 半径 km
  - フリーキーワード: common_name / scientific_name / メモ部分一致
- **処理**: クエリパラメータ化、URL 同期 (deep link 可)
- **出力**: 条件マッチした discoveries

### UC 4: discovery 詳細・編集
- **トリガー**: 任意モードからカード or ピン or タイル押下
- **入力**: discovery_id (URL param)
- **編集可能フィールド**: common_name / user_note / location (タップで地図ピン移動)
- **保持されるフィールド**: original_common_name (AI 結果) / scientific_name / confidence / captured_at
- **編集履歴**: discovery_edits テーブルに append-only ログ (audit-like)
- **出力**: 詳細画面、編集後は同画面 reload

### UC 5: discovery 削除
- **トリガー**: 詳細画面の「削除」ボタン
- **処理**: 確認 modal → discoveries soft delete (deleted_at set) + 30 日後 cron で完全削除 + Storage object 削除
- **出力**: 一覧に戻る、削除済 discovery は表示されない

### UC 6: 月次フォトコラージュ生成 + シェア (concept §4.8.2 連携)
- **トリガー**: notebook 一覧上部の「月次コラージュ」ボタン (月初 or 前月分が見れるタイミング)
- **処理**:
  1. 前月の identified discoveries 全件を取得
  2. クライアント側 (canvas) で 9 枚グリッドのコラージュ画像生成 (1080x1080 px、Instagram 想定)
  3. プレビュー画面表示 + 「シェア」「保存」ボタン
  4. シェア → Web Share API or 各 SNS リンク (X / Facebook / コピー URL)
- **OG カード**: シェア URL に動的 OG 画像生成 (`/coll/{id}.png`、Vercel OG Image)
- **シェアコンテンツ末尾**: 「hana-memo で記録 https://hana-memo.app」(控えめなクレジット)
- **出力**: 画像 (Storage 内 ephemeral) + シェア URL
- **強制シェアなし** (charter §2.2 OK ライン: 「シェアしなくても全機能使える」維持)

### UC 7: 再識別呼出 (capture UC2 と統合)
- **トリガー**: 一覧の pending discovery 上に「再識別」ボタン
- **処理**: capture/lib/retryIdentify を呼出
- **出力**: identifying → 結果反映

## 2. 入出力

### 2.1 API
| メソッド | パス | 入力 | 出力 | 認証 |
|---|---|---|---|---|
| (Supabase) `from('discoveries').select` | DB | フィルタ + pagination | discoveries[] | RLS |
| (Supabase) `from('discoveries').update` | DB | id + 編集フィールド | updated row | RLS |
| (Supabase) `from('discoveries').delete` | DB | id (soft) | — | RLS |
| (Supabase) `from('discovery_edits').insert` | DB | 編集前後値 | — | RLS |
| (Edge Function) `og-collage/[id]` | GET | id | PNG (Vercel OG) | public (URL は推測困難) |

### 2.2 画面入力
| 画面 | フィールド | 必須 | 説明 |
|---|---|---|---|
| 詳細編集 | common_name | 任意 | 最大 100 文字 |
| 詳細編集 | user_note | 任意 | 最大 500 文字 |
| 詳細編集 | location (lat/lng) | 任意 | 地図ピンドラッグ |
| フィルタ | 各条件 | 任意 | 全 OFF で全件 |

### 2.3 副作用
- DB 更新: discoveries (UPDATE / soft delete), discovery_edits (INSERT)
- Storage: 削除時は object 削除 (delete cron)
- 外部送信: シェア時にユーザー操作で SNS API or Web Share

## 3. データモデル
- 既存 `discoveries` (`_shared/db`) に **追加カラム**:
  - `original_common_name text` — AI が最初に返した値
  - `user_overridden_name text` — ユーザー編集値 (null なら AI 値を表示)
  - `user_note text` (既存) — メモ
  - `deleted_at timestamptz` — soft delete
- **新規テーブル `discovery_edits`** (append-only):
  - id, discovery_id, user_id, edited_at, field_name (enum: common_name/location/user_note), before_value, after_value
  - RLS: 自分の edit のみ select/insert、update/delete 禁止

## 4. バリデーション + エラーケース

### 4.1 バリデーション
| 対象 | ルール | エラー |
|---|---|---|
| common_name | 任意、100 文字以下 | trim |
| user_note | 任意、500 文字以下 | trim |
| location | -90 <= lat <= 90, -180 <= lng <= 180 | reject |
| フィルタ場所円半径 | 0.1 <= km <= 100 | clamp |

### 4.2 エラーケース
| ID | 条件 | 対応 |
|---|---|---|
| E-NB-001 | discoveries fetch 失敗 | retry 2 回 + skeleton loading |
| E-NB-002 | 署名 URL 取得失敗 | placeholder 画像 + 「画像取得失敗」 |
| E-NB-003 | 編集 RLS 拒否 | toast「編集できません」 |
| E-NB-004 | コラージュ生成失敗 (canvas) | エラー表示 + リトライボタン |
| E-NB-005 | Web Share API 未対応ブラウザ | コピー URL + 各 SNS リンクに fallback |

## 5. 機能固有 NFR + 既存機能連携

### 5.1 NFR
| 項目 | 目標値 | 根拠 |
|---|---|---|
| 一覧 20 件初期表示 | < 1.5s (P95) | UX |
| 無限スクロール 1 ページ追加 | < 800ms | UX |
| モード切替 | < 300ms (キャッシュ済 data 流用) | UX |
| 編集保存 | < 500ms (optimistic update) | UX |
| コラージュ生成 (9 枚) | < 5s (clientside canvas) | UX |

### 5.2 連携
| 連携先 | 種別 | 依存内容 |
|---|---|---|
| `_shared/db` | SELECT/UPDATE | discoveries, discovery_edits |
| `_shared/storage` | useSignedUrl | 画像表示 |
| `_shared/auth` | session | RLS 整合 |
| `account` | settings 参照 | 表示密度 等 (将来) |
| `capture` | retryIdentify | UC7 |
| `export` | データソース | PDF/CSV 生成 |
| `memory` | recommendation | 季節レコメンド一覧 |

## 6. タグ別追加

### 6.1 認可 (auth-required)
- discoveries RLS: `auth.uid() = user_id`
- discovery_edits: 自分の edit のみ
- og-collage Edge Function は公開 (URL に id を含む、推測困難な uuid)

## 7. スコープ外
- ユーザー間共有 (フォロー / 友達) → v2
- コメント機能 → v2
- アルバム自作 → v2 (MVP は月次自動コラージュのみ)
- 画像編集 (crop, filter) → v2
- 削除済 discovery の復元 → 30 日 grace 内のみ可 (将来実装、MVP は不可)

## 8. 未決事項
> 現時点で論点なし (2026-05-22)
>
> 関連: [論点-005] アナリティクス導入時に notebook の利用パターン計測

## 9. 更新履歴
| 日付 | 変更概要 | 実行者 |
|---|---|---|
| 2026-05-22 | 初版作成 | /flow:feature |

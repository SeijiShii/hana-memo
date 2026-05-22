# export 機能仕様書

> **役割**: 図鑑 PDF (PWYW unlock 後利用可) + 全データ CSV/JSON (無料、撤退時のデータ持出し)
> **タグ**: feature / auth-required
> **最終更新**: 2026-05-22
> **入力アーティファクト**: `../concept.md` §1.1 UC3, §4.7.5 撤退手順, `../billing/`, `../notebook/`

---

## 1. 詳細 UC

### UC 1: 図鑑 PDF エクスポート (PWYW unlock 後)
- **トリガー**: notebook / 設定の「PDF ダウンロード」
- **前提**: OAuth 済 + users.pdf_unlocked=true (billing UC2 完了済)
- **入力**:
  - フィルタ: 月範囲 / 季節 / ステータス (識別済のみ)
  - レイアウト: A4 縦 / 4 枚 grid (固定、MVP)
- **処理ステップ**:
  1. discoveries を条件 fetch (識別済のみ、画像 URL 含む)
  2. clientside で html2canvas + jsPDF で生成
     - 表紙: タイトル + ユーザー名 + 期間
     - 各ページ: 4 grid (画像 + common_name + scientific_name + 撮影日 + 場所)
     - 巻末: 統計サマリ (件数 / 種別数 / 期間)
  3. ファイル名: `hanamemo_{period}_{count}件.pdf` で保存
- **出力**: ローカルダウンロード (Storage 経由なし、ブラウザ保存)
- **未 unlock 時**: PDF ダウンロードボタンが「アンロック (¥500 PWYW)」に変化、押下で billing UC2 へ

### UC 2: 全データ CSV エクスポート (無料)
- **トリガー**: 設定 → 「全データを CSV でダウンロード」
- **前提**: 認証済 (匿名でも可)
- **入力**: なし (全 discoveries + edit log + 同意ログ)
- **処理**:
  1. 4 つの CSV を ZIP に固める (`discoveries.csv` / `discovery_edits.csv` / `consent_logs.csv` / `billing_unlocks.csv`)
  2. clientside Blob 生成 + ダウンロード
- **出力**: ZIP ファイル `hanamemo_export_{user_id_short}_{YYYYMMDD}.zip`
- **目的**: §4.7.5 撤退手順 + 個人情報保護法の開示請求対応

### UC 3: JSON エクスポート (無料、API 互換)
- **トリガー**: 設定 → 「全データを JSON でダウンロード」
- **処理**: 同上を JSON 構造で生成 (構造は `_shared/types/domain.ts` 準拠)
- **出力**: `.json` ファイル

### UC 4: 画像 ZIP エクスポート (無料、別途)
- **トリガー**: 設定 → 「画像を ZIP でダウンロード」
- **処理**: Supabase Storage から自分の全画像を一括 fetch + zip
- **出力**: `hanamemo_images_{YYYYMMDD}.zip`
- **NFR**: 画像数 1000 件超で UX 劣化 → 100 件ずつ並列 fetch + プログレスバー

## 2. 入出力

### 2.1 API
| メソッド | パス | 入力 | 出力 | 認証 |
|---|---|---|---|---|
| (Supabase) `from('discoveries').select` | DB | filter | rows | RLS |
| (Storage) `download` (画像) | GET | path | blob | RLS (署名 URL) |

### 2.2 画面入力
| 画面 | フィールド | 必須 | 説明 |
|---|---|---|---|
| PDF | 月範囲 (start/end) | 任意 | デフォルト全期間 |
| PDF | 季節 | 任意 | 春夏秋冬 |
| PDF | ステータス | ✅ | identified のみ (default、固定) |

### 2.3 副作用
- DB 読込のみ
- Storage 読込 (大量画像)
- ブラウザ Blob 生成 + ダウンロード

## 3. データモデル
新規エンティティなし。既存 discoveries / images / consent_logs / billing_unlocks / discovery_edits を参照。

## 4. バリデーション + エラーケース

### 4.1 バリデーション
| 対象 | ルール | エラー |
|---|---|---|
| 月範囲 | start <= end、両方未指定で全期間 | reject 「期間が不正」 |
| PDF 件数 | <= 200 件 (クライアントメモリ制限) | エラー「200 件以下に絞ってください」 |

### 4.2 エラーケース
| ID | 条件 | 対応 |
|---|---|---|
| E-EX-001 | PDF 生成中メモリ不足 (モバイル Safari 等) | エラー + 「件数を減らして再試行」 |
| E-EX-002 | Storage 画像 fetch 失敗 | 該当画像をプレースホルダ表示で続行 |
| E-EX-003 | 0 件 PDF | エラー「該当 discovery なし」 |
| E-EX-004 | unlock なしで PDF 試行 | UI 側で disable + billing 誘導 |
| E-EX-005 | CSV 文字化け | UTF-8 BOM 付加で Excel 互換 |
| E-EX-006 | 画像 ZIP 1000 件超 | 並列制御 + プログレス、cancel ボタン |

## 5. 機能固有 NFR + 既存機能連携

### 5.1 NFR
| 項目 | 目標値 | 根拠 |
|---|---|---|
| PDF 50 件 生成 | < 30s | UX |
| CSV 1000 件 生成 | < 5s | UX |
| 画像 ZIP 100 件 (avg 500KB) | < 60s | 50MB transfer |
| メモリ使用 (PDF 50 件) | < 200MB | モバイル制約 |

### 5.2 連携
| 連携先 | 種別 | 依存内容 |
|---|---|---|
| `_shared/db` | SELECT | discoveries 他 |
| `_shared/storage` | listUserImages + signed URL | 画像 fetch |
| `_shared/auth` | session | RLS 整合 |
| `notebook` | フィルタ共有 | useDiscoveries 借用 |
| `billing` | pdf_unlocked 確認 | usePdfUnlocked |
| `account` | 設定 UI 組込 | エクスポート リンク |

## 6. タグ別追加

### 6.1 認可 (auth-required)
- 自分のデータのみ export (RLS)
- 削除予約 user (deleted_at set) は export 不可 (UI で disable)

## 7. スコープ外
- 他 user の発見を含む共有図鑑 → v2
- カスタムレイアウト (1/2/6 grid) → v2
- 印刷サービス連携 (Tolot 等) → v2
- カスタム表紙画像 → v2
- 多言語 PDF → 日本語のみ
- PDF 内に AI 識別の信頼度を表示 → v2 オプション

## 8. 未決事項
> 現時点で論点なし (2026-05-22)
>
> 論点-003 (PDF エンジン) は本セッションで解決 (D20260522-104)

## 9. 更新履歴
| 日付 | 変更概要 | 実行者 |
|---|---|---|
| 2026-05-22 | 初版作成 | /flow:feature |

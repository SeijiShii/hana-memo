# legal 機能仕様書

> **役割**: プライバシーポリシー / 利用規約 / 特定商取引法表記 / AI 利用同意の表示・同意取得・改訂時再同意
> **タグ**: feature / auth-required / stateful
> **最終更新**: 2026-05-22
> **入力アーティファクト**: `../concept.md` §9, `./README.md`

---

## 1. 詳細 UC

### UC 1: 初回起動時の同意取得
- **トリガー**: 起動時、匿名 Auth で users INSERT 直後、consent_logs に該当 user の最新 doc_version 記録がない
- **前提**: 認証済 (匿名でも可)
- **入力**: 「プライバシーポリシー」「利用規約」「AI 利用同意」の 3 チェックボックス + 「同意して始める」ボタン
- **処理ステップ**:
  1. 3 チェックボックスが全 ON でないとボタン disabled
  2. ボタン押下で 3 件 INSERT (`consent_logs` に doc_type 別)
  3. 同意完了フラグを localStorage に保存 (次回起動時の判定高速化)
  4. メイン画面 (カメラ画面) に遷移
- **出力**: 画面遷移 / `consent_logs` 3 件
- **代替フロー**: ユーザーが拒否 → 「サービスを利用できません」表示 + 起動中止 (匿名 user は孤児化、cron で 30 日後削除)

### UC 2: フッタリンクから /legal/* 静的ページ閲覧
- **トリガー**: 全画面フッタの「プライバシーポリシー / 利用規約 / 特商法表記 / お問い合わせ」リンク
- **前提**: 認証不要 (公開ページ)
- **入力**: URL アクセス (`/legal/privacy`, `/legal/terms`, `/legal/specified-commercial-transactions`)
- **処理**: Markdown 原稿を React コンポーネントとしてレンダリング
- **出力**: 静的ページ表示

### UC 3: 設定画面で同意状況確認・再閲覧
- **トリガー**: 設定画面 → 「法務情報」セクション
- **入力**: なし
- **処理**: 自分の最新同意ログ (`consent_logs.doc_version` 別) を表示 + 「再閲覧」リンク
- **出力**: 同意日時 + バージョン一覧

### UC 4: プラポリ・利用規約改訂時の再同意フロー
- **トリガー**: 起動時、`consent_logs` の最新 doc_version < アプリ側定数 `LATEST_VERSIONS`
- **入力**: 該当書類の差分要約 + 全文閲覧リンク + 「同意して続ける」or「サービスを利用しない」
- **処理**:
  1. 該当 doc_type のみのチェックボックス + ボタン表示
  2. 同意で新 doc_version の row を `consent_logs` INSERT (旧 row は残す、append-only)
  3. 「利用しない」で本セッション終了 (再度起動時に再表示)
- **出力**: `consent_logs` 1 件 / 画面遷移

## 2. 入出力

### 2.1 API
| メソッド | パス | 入力 | 出力 | 認証 |
|---|---|---|---|---|
| (Supabase RPC) `record_consent` | RPC | `{doc_type, doc_version, agreed: true}` | inserted row | 認証必須 |
| (フロント) `getLatestConsents(userId)` | (Supabase client) | `userId` | `Record<doc_type, latest_version>` | 認証必須 |

> ※ シンプルに `supabase.from('consent_logs').insert(...)` で済むため RPC は任意。本 SPEC では RPC を採用 (改訂時の atomic 更新と統一インターフェース)。

### 2.2 画面入力
| 画面 | フィールド | 必須 | 説明 |
|---|---|---|---|
| 初回同意 | プラポリ checkbox | ✅ | |
| 初回同意 | 利用規約 checkbox | ✅ | |
| 初回同意 | AI 利用同意 checkbox | ✅ | |
| 再同意 | 該当 doc_type checkbox | ✅ | |

### 2.3 副作用
- DB 書込: `consent_logs` (1〜3 件 / 同意操作ごと)
- localStorage: `hanamemo_consent_versions = {privacy_policy: 'v1.0.0', ...}` (次回起動高速化)
- ハッシュ化 IP を `ip_hash` に保存 (SHA-256, salt は `.env`)

## 3. データモデル
新規エンティティなし。`consent_logs` テーブル (`_shared/db/001_db_SPEC.md` §3.1 で定義済)。
アプリ側定数: `LATEST_VERSIONS = {privacy_policy: 'v1.0.0', terms_of_service: 'v1.0.0', ai_usage: 'v1.0.0', cookie_policy: null}` (Cookie ポリシーは [論点-005] 解決後に追加)。

## 4. バリデーション + エラーケース

### 4.1 バリデーション
| 対象 | ルール | エラーメッセージ |
|---|---|---|
| チェックボックス | 全 ON でないと送信不可 | ボタン disabled、ヒントテキスト「全項目に同意が必要です」 |
| doc_version | 形式 `vX.Y.Z` | (アプリ定数なので runtime バリデーション不要) |

### 4.2 エラーケース
| ID | 条件 | 対応 |
|---|---|---|
| E-LE-001 | consent_logs INSERT 失敗 (ネットワーク) | リトライ 3 回 → 失敗時「もう一度お試しください」モーダル |
| E-LE-002 | localStorage 利用不可 (private モード等) | フォールバック: 毎起動で DB 確認 |
| E-LE-003 | 同意拒否 → 起動継続できない旨表示 | 「サービスを利用できません。同意がいただける場合は再度起動してください」 |
| E-LE-004 | doc 改訂後の旧版 consent_log が存在しない | 初回同意フローを再実行 |

## 5. 機能固有 NFR + 既存機能連携

### 5.1 NFR
| 項目 | 目標値 | 根拠 |
|---|---|---|
| 同意 UI 表示時間 | < 500ms (画面遷移後) | 起動 UX |
| consent_logs INSERT | < 1s | 3 件 batch |
| 静的ページ初回ロード | < 2s | LCP 目標、Markdown は build 時に静的化 |
| アクセシビリティ | WCAG 2.1 AA 準拠 (チェックボックス + キーボード操作) | 法的同意 UI のため重要 |

### 5.2 連携
| 連携先 | 種別 | 依存内容 |
|---|---|---|
| `_shared/db` | データ書込 | consent_logs INSERT |
| `_shared/helpers/id.ts` | 関数呼出 | `hashIp` で IP ハッシュ化 |
| `account` | 設定画面組込 | UC3 の表示は `account` 機能の設定画面内に置く |
| `capture` | AI 利用同意の存在前提 | 起動時に同意済を確認 (未同意なら capture 機能無効) |
| `billing` | 利用規約の存在前提 | 課金時の同意済を確認 |

## 6. タグ別追加

### 6.1 認可 (auth-required)
- consent_logs INSERT は `auth.uid() = user_id` で RLS 制限
- 静的ページ閲覧は認証不要 (公開、誰でも見れる)

### 6.2 状態遷移 (stateful)
- consent_logs は append-only (UPDATE/DELETE 禁止、RLS でも拒否)
- 改訂時は新版 row を追加し、旧版も残す (法的トレース性)

## 7. スコープ外
- 多言語対応 (i18n) — MVP は日本語のみ
- Cookie ポリシー — [論点-005] アナリティクス導入時に追加
- 同意の withdraw (撤回) → MVP は同意取消し UI なし (アカウント削除で代替)
- GDPR DSR (Data Subject Request) 対応 — 国内向け MVP のため不要 (concept §9.2)

## 8. 未決事項

### [論点-009] お問い合わせフォーム実装方針
- **影響範囲**: `legal/` (フッタリンク先) / `account/` (UI 配置候補)
- **詰めるべき問い**:
  1. 自前フォーム (Supabase + Resend) vs SaaS (Formspree / Tally)?
  2. お問い合わせ自体は legal 配下 (`/legal/contact`) か account 配下 (`/account/contact`) か?
- **推奨**: **自前フォーム (Supabase Edge Function + Resend 無料枠) + URL は `/legal/contact`** (法務・問合せ系を 1 箇所に集約)
- **判断期限**: `/flow:feature account` 着手前
- **担当**: seiji

## 9. 更新履歴
| 日付 | 変更概要 | 実行者 |
|---|---|---|
| 2026-05-22 | 初版作成 | /flow:feature |

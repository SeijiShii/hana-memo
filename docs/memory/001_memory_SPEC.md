# memory 機能仕様書

> **役割**: 季節レコメンド「去年の今頃に見た花」(UC5)
> **タグ**: feature / auth-required
> **最終更新**: 2026-05-22
> **入力アーティファクト**: `../concept.md` §1.1 UC5, `../notebook/`, `../_shared/helpers/date.ts`, `../_shared/helpers/season.ts`

> **2026-05-22 BaaS Pivot 反映**: 本 SPEC 内で Supabase 関連の表現 (例: `supabase.from(...).insert`、Supabase Storage、Edge Function、Anonymous Auth、RLS `auth.uid()`) は **Neon (Drizzle ORM) + Clerk (Guest Users + linkIdentity) + Cloudflare R2 (Presigned URL) + Vercel Functions** に読み替えること。具体的な SDK 呼出と RLS 代替 (Drizzle 層 `where user_id = ctx.userId`) は実装フェーズ `/dev-spec` で再設計する。マッピング詳細は concept.md §6 / `_shared/{auth,db,storage,ai}` SPEC を参照。

---

## 1. 詳細 UC

### UC 1: 起動時の「去年の今頃」バッジ表示
- **トリガー**: notebook 初期表示時
- **前提**: 認証済、前年同期間に identified discovery が 1 件以上ある
- **処理**:
  1. 今日の日付 ± 15 日範囲を計算
  2. 前年の同期間 + season 一致で discoveries を fetch (identified のみ)
  3. 件数 N >= 1 ならバッジ表示「去年の今頃 N 件」
- **出力**: notebook ヘッダ右上にバッジ + タップで「去年の今頃」セクションへスクロール

### UC 2: 「去年の今頃」セクション
- **位置**: notebook タイムラインの最上部 (今日の発見の直前)
- **内容**: 前年データ最大 5 件を横スクロールカルーセル
- **各カード**: 画像 + common_name + 撮影日 (yyyy-mm-dd) + 場所概略 + 「詳細を見る」リンク
- **詳細リンク先**: 既存 notebook の DiscoveryDetailPage
- **0 件**: セクション自体非表示 (CTA 出さない)

### UC 3: 月初リマインド (将来拡張、MVP は実装しない)
- **トリガー**: 毎月 1 日にバッジが少し目立つ表示 (色変化のみ)
- **MVP 範囲外**: 押し付けない方針 (charter §2.2)
- **記載理由**: 設計の意図を残す

### UC 4: 設定でのレコメンド ON/OFF (MVP は ON 固定、UI なし)
- **MVP 範囲外**: 全 user で ON、押し付けが薄いため設定不要
- **v2 で追加検討**: user_settings.memory_enabled

## 2. 入出力

### 2.1 API
| メソッド | パス | 入力 | 出力 | 認証 |
|---|---|---|---|---|
| (Supabase) `from('discoveries').select` | DB | filter (前年 ±15 日 + season + identified) | discoveries[] | RLS |

### 2.2 画面入力
| 画面 | フィールド | 必須 | 説明 |
|---|---|---|---|
| (なし) | — | — | レコメンドは自動表示 |

### 2.3 副作用
- DB 読込のみ (副作用なし)
- localStorage キャッシュ: 当日分のレコメンド結果 (1 日 1 回再計算)

## 3. データモデル
新規エンティティなし。既存 discoveries を query するのみ。

## 4. バリデーション + エラーケース

### 4.1 バリデーション
| 対象 | ルール | エラー |
|---|---|---|
| (なし) | — | — |

### 4.2 エラーケース
| ID | 条件 | 対応 |
|---|---|---|
| E-ME-001 | DB fetch 失敗 | silent fail (バッジ非表示) + console.warn |
| E-ME-002 | 前年データ 0 件 | UC1 で何も表示しない (charter §2.2 配慮) |
| E-ME-003 | 新規 user (登録 < 1 年) | 同上 |

## 5. 機能固有 NFR + 既存機能連携

### 5.1 NFR
| 項目 | 目標値 | 根拠 |
|---|---|---|
| バッジ取得 | < 500ms (notebook 初期表示中) | UX |
| キャッシュ TTL | 24 時間 (1 日 1 回再計算) | 軽量化 |
| メモリオーバーヘッド | < 10MB | モバイル制約 |

### 5.2 連携
| 連携先 | 種別 | 依存内容 |
|---|---|---|
| `_shared/db` | SELECT | discoveries 前年データ |
| `_shared/helpers/date` | 関数呼出 | 日付範囲計算 |
| `_shared/helpers/season` | 関数呼出 | getCurrentSeason |
| `_shared/auth` | session | RLS 整合 |
| `notebook` | UI 組込 | バッジ + セクションを TimelineView に統合 |

## 6. タグ別追加

### 6.1 認可 (auth-required)
- 自分の前年 discovery のみ (RLS)

## 7. スコープ外
- Push 通知 → [論点-002] α 後判断 (charter §1.1「気軽」優先)
- Email 通知 → 同上
- 月初リマインド演出 → UC3 として記録のみ、MVP 範囲外
- 設定 ON/OFF → MVP は ON 固定
- AI 生成のレコメンドコメント (「あの日と同じ場所」等) → v2
- 数年前 (2 年前以上) のデータ → MVP は前年のみ

## 8. 未決事項
> 現時点で論点なし (2026-05-22)
>
> [論点-002] 通知方式 → 本セッションで MVP は「アプリ内バッジのみ」に確定 (D20260522-111)。
> Push / Email の採否は α 後にユーザー利用パターンを見て再判断。

## 9. 更新履歴
| 日付 | 変更概要 | 実行者 |
|---|---|---|
| 2026-05-22 | 初版作成 | /flow:feature |

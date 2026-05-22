# _shared/db 仕様書

> **役割**: PostgreSQL スキーマ・マイグレーション・RLS ポリシーの一元定義 (Supabase Postgres)
> **タグ**: cross-cutting / auth-required / stateful / analytics
> **最終更新**: 2026-05-22
> **入力アーティファクト**: `../../concept.md`, `./README.md`

---

## 1. 提供インターフェース (cross-cutting)

本横断モジュールは「テーブル定義 + RLS ポリシー + 型生成」をプロダクト全体に提供する。SQL マイグレーションとして適用され、Supabase クライアント (`@supabase/supabase-js`) 経由でアクセスされる。

### 1.1 提供する型 (Supabase 自動生成、`_shared/types/supabase.ts`)

- `Database.public.Tables.<table>.{Row, Insert, Update}`
- Enum: `DiscoveryStatus`, `ConsentDocType`, `BillingSku`

### 1.2 提供する RLS ポリシー

| ポリシー | 対象テーブル | 動作 |
|---|---|---|
| `<table>_own_rows` | users / discoveries / images / api_usage / billing_unlocks / user_settings / consent_logs | `auth.uid() = user_id` で SELECT/INSERT/UPDATE/DELETE 制限 |
| `plants_public_read` | plants | 全認証 user (匿名含む) で SELECT 許可、書込は service_role のみ (Edge Function 経由) |

## 2. 入出力

### 2.1 API (SQL マイグレーション)
| 操作 | 入力 | 出力 | 認証 |
|---|---|---|---|
| `supabase migration new <name>` | マイグレーション名 | 新規 SQL ファイル | (ローカル) |
| `supabase migration up` | (なし) | 適用ログ | service_role |
| `supabase db reset` | (なし) | DB 全リセット + seed | service_role |
| `supabase gen types typescript --local` | (なし) | TypeScript 型ファイル | (ローカル) |

### 2.2 副作用
- DB スキーマ変更: マイグレーション適用で全テーブル / RLS / index が更新
- 型生成: `_shared/types/supabase.ts` が再生成 (他コンポーネントへ波及)

## 3. データモデル

### 3.1 テーブル定義

#### users (Supabase Auth が管理する `auth.users` + プロファイル `public.users`)

| フィールド | 型 | 制約 | 備考 |
|---|---|---|---|
| id | uuid | PK, FK→auth.users.id | Supabase Auth が発行 |
| email | text | nullable | 匿名時は null、OAuth リンク後に埋まる |
| oauth_provider | text | nullable | 'google' \| null |
| is_anonymous | boolean | NOT NULL DEFAULT true | Anonymous Auth 起動時 true、OAuth リンクで false |
| linked_at | timestamptz | nullable | OAuth リンク時刻 |
| created_at | timestamptz | NOT NULL DEFAULT now() | |
| updated_at | timestamptz | NOT NULL DEFAULT now() | trigger で更新 |

#### plants (植物マスタ、AI 同定結果キャッシュ)

| フィールド | 型 | 制約 | 備考 |
|---|---|---|---|
| id | uuid | PK | |
| scientific_name | text | NOT NULL UNIQUE | 学名 |
| common_name_ja | text | NOT NULL | 日本語通称 |
| family | text | nullable | 科 |
| season_months | int[] | nullable | 開花期 (1-12) |
| care_info | jsonb | nullable | 育成情報 (構造化) |
| image_ref | text | nullable | 参考画像 URL |
| created_at | timestamptz | NOT NULL DEFAULT now() | |
| identification_count | int | NOT NULL DEFAULT 0 | 同定された回数 (キャッシュヒット率測定) |

> Index: `(common_name_ja)` (検索)、`(scientific_name)` (UNIQUE)

#### discoveries (発見レコード、本サービスのコア)

| フィールド | 型 | 制約 | 備考 |
|---|---|---|---|
| id | uuid | PK | |
| user_id | uuid | NOT NULL, FK→users.id | |
| image_id | uuid | NOT NULL, FK→images.id | |
| captured_at | timestamptz | NOT NULL | 撮影時刻 (EXIF or アップロード時刻) |
| location_lat | numeric(9,6) | nullable | ~100m 丸め適用後 ([論点-004]) |
| location_lng | numeric(9,6) | nullable | 同上 |
| location_precision_m | int | nullable | 丸め粒度 (100 等)、ユーザー設定で変更可 |
| plant_candidates | jsonb | NOT NULL | `[{plant_id, confidence, name_ja, name_sci}, ...]` |
| selected_plant_id | uuid | nullable, FK→plants.id | ユーザー選択 (null = 「分からないまま保存」) |
| user_note | text | nullable | メモ |
| status | discovery_status | NOT NULL DEFAULT 'identified' | enum |
| created_at | timestamptz | NOT NULL DEFAULT now() | |
| updated_at | timestamptz | NOT NULL DEFAULT now() | trigger で更新 |

> Enum `discovery_status`: `identifying` (AI 同定中) / `identified` (完了) / `pending` (同定失敗、リトライ可能) / `unknown` (ユーザーが「分からない」で保存)
> Index: `(user_id, captured_at DESC)` (タイムライン)、`(user_id, selected_plant_id)` (図鑑モード)

#### images (画像メタ)

| フィールド | 型 | 制約 | 備考 |
|---|---|---|---|
| id | uuid | PK | |
| user_id | uuid | NOT NULL, FK→users.id | |
| storage_path | text | NOT NULL | Supabase Storage オブジェクトパス (original) |
| thumbnail_path | text | nullable | Storage 内 thumbnail パス |
| original_size_bytes | int | NOT NULL | |
| mime | text | NOT NULL | 'image/webp' 等 |
| width_px | int | nullable | |
| height_px | int | nullable | |
| exif_stripped | boolean | NOT NULL DEFAULT true | アップロード時に必ず削除 |
| created_at | timestamptz | NOT NULL DEFAULT now() | |

> Index: `(user_id, created_at DESC)`

#### api_usage (§4.6.2 コスト集計の源泉、analytics タグ)

| フィールド | 型 | 制約 | 備考 |
|---|---|---|---|
| id | bigserial | PK | 高頻度書込のため bigint |
| user_id | uuid | NOT NULL, FK→users.id | |
| service | text | NOT NULL | 'openai' 等 |
| endpoint | text | NOT NULL | 'gpt-4o-mini-vision' 等 |
| input_tokens | int | NOT NULL DEFAULT 0 | |
| output_tokens | int | NOT NULL DEFAULT 0 | |
| image_count | int | NOT NULL DEFAULT 0 | Vision API 用 |
| success | boolean | NOT NULL | |
| latency_ms | int | nullable | |
| created_at | timestamptz | NOT NULL DEFAULT now() | |

> Index: `(user_id, created_at DESC)` (ユーザー月間枠カウント)、`(created_at DESC)` (日次集計)
> 月次マテビュー: `api_usage_monthly` (user_id, year_month, service, total_input_tokens, total_output_tokens, total_image_count, total_calls, success_rate, estimated_cost_usd)

#### billing_unlocks (課金履歴、content-unlock 解錠記録)

| フィールド | 型 | 制約 | 備考 |
|---|---|---|---|
| id | uuid | PK | |
| user_id | uuid | NOT NULL, FK→users.id | OAuth リンク済 user に限定 |
| sku | billing_sku | NOT NULL | enum |
| amount_jpy | int | NOT NULL | |
| stripe_session_id | text | NOT NULL UNIQUE | |
| unlocked_at | timestamptz | NOT NULL DEFAULT now() | |
| expires_at | timestamptz | nullable | NULL = 永続 (一回課金) |

> Enum `billing_sku`: `ai_credits_20` (AI 追加 20 回) / `pdf_export` (図鑑 PDF 1 回) / `pwyw_tip_100`/`_300`/`_500`/`_1000` (投げ銭)
> Index: `(user_id, unlocked_at DESC)`、`(stripe_session_id)` UNIQUE

#### user_settings (ユーザー設定)

| フィールド | 型 | 制約 | 備考 |
|---|---|---|---|
| user_id | uuid | PK, FK→users.id | 1:1 |
| location_enabled | boolean | NOT NULL DEFAULT false | デフォルト OFF |
| location_precision_m | int | NOT NULL DEFAULT 100 | 100/0 (完全)/-1 (エリア名のみ) |
| ai_enabled | boolean | NOT NULL DEFAULT true | AI 同定 ON/OFF |
| share_default | boolean | NOT NULL DEFAULT false | 共有時のデフォルト挙動 |
| notification_in_app | boolean | NOT NULL DEFAULT true | 季節レコメンドバッジ |
| analytics_opt_in | boolean | NOT NULL DEFAULT false | Sentry opt-in (default OFF、個情法対応) |
| updated_at | timestamptz | NOT NULL DEFAULT now() | |

#### consent_logs (法務改訂時の再同意トレース)

| フィールド | 型 | 制約 | 備考 |
|---|---|---|---|
| id | uuid | PK | |
| user_id | uuid | NOT NULL, FK→users.id | |
| doc_type | consent_doc_type | NOT NULL | enum |
| doc_version | text | NOT NULL | 'v1.0.0' 等 |
| agreed_at | timestamptz | NOT NULL DEFAULT now() | |
| ip_hash | text | nullable | SHA-256 ハッシュ (個人特定回避) |

> Enum `consent_doc_type`: `privacy_policy` / `terms_of_service` / `ai_usage` / `cookie_policy`
> Index: `(user_id, doc_type, agreed_at DESC)`

### 3.2 既存エンティティへの変更
(初版のため変更なし)

## 4. バリデーション + エラーケース

### 4.1 制約・トリガー
| 対象 | ルール | 実装 |
|---|---|---|
| users.is_anonymous | OAuth リンク後は必ず false + email/oauth_provider/linked_at が NOT NULL | trigger or CHECK |
| discoveries.captured_at | NOT IN FUTURE (now() より後を拒否) | CHECK |
| images.original_size_bytes | <= 10MB | CHECK |
| api_usage | append-only (UPDATE/DELETE 禁止) | RLS で DELETE/UPDATE 拒否 |
| billing_unlocks | append-only | 同上 |
| consent_logs | append-only | 同上 |
| updated_at | 自動更新 (BEFORE UPDATE トリガー) | trigger関数 `set_updated_at()` |

### 4.2 エラーケース
| ID | 条件 | 対応 |
|---|---|---|
| E-DB-001 | RLS により他 user の行へアクセス試行 | Supabase が空配列返却 (エラーにはならない、検知は API 層で) |
| E-DB-002 | 匿名 user が billing_unlocks INSERT 試行 | RLS で拒否 ([論点-007] 関連、課金は OAuth リンク必須) |
| E-DB-003 | マイグレーション競合 (同時適用) | Supabase CLI が排他制御 |
| E-DB-004 | 同一 stripe_session_id 重複 | UNIQUE 制約違反 → アプリ層で冪等性確保 |

## 5. 機能固有 NFR + 既存機能連携

### 5.1 機能固有 NFR
| 項目 | 目標値 | 根拠 |
|---|---|---|
| RLS 評価オーバーヘッド | < 5ms / クエリ | Supabase 標準 |
| api_usage 書込頻度 | 1 user あたり 〜10 回/月 (無料枠) | §4.6.2 |
| 月次マテビュー再計算 | < 30s / 日次バッチ | Supabase Free DB CPU 制約 |
| マイグレーション適用時間 | < 60s (初回 + seed 含む) | ローカル開発時の待ち時間 |
| DB サイズ | < 500MB (Supabase Free 上限) | DAU 100 想定で十分余裕 |

### 5.2 既存機能連携 (被依存先)
| 連携先 | 種別 | 依存内容 |
|---|---|---|
| _shared/auth | 認証連携 | auth.uid() を RLS で参照 |
| _shared/storage | データ参照 | images.storage_path で Storage オブジェクトを指す |
| _shared/ai | データ書込 | api_usage の INSERT (cost tracking) |
| account | データ参照/書込 | users / user_settings / consent_logs |
| capture | データ書込 | discoveries / images / api_usage |
| notebook | データ参照 | discoveries / plants / images (read-only) |
| export | データ参照 | discoveries / plants / images (read-only) |
| memory | データ参照 | discoveries (年比較クエリ) |
| billing | データ書込 | billing_unlocks |
| legal | データ書込 | consent_logs |

## 6. タグ別追加項目

### 6.1 認可 (auth-required)
- **RLS 標準パターン**: 全 user-owned テーブルに `CREATE POLICY <name> ON <table> USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id)`
- **plants 例外**: `USING (true) WITH CHECK (false)` (全 user read 可、書込は service_role のみ)
- **匿名 user**: auth.uid() は anonymous JWT 内 UUID を返す。同じ user_id で書込・読込可能
- **service_role**: Edge Function 内のみ (plants マスタ更新時)

### 6.2 状態遷移 (stateful)
- **discoveries.status**:
  ```
  identifying → identified (AI 成功)
  identifying → pending   (AI 失敗、リトライ可能)
  identifying → unknown   (ユーザーが「分からない」選択)
  identified → identified (selected_plant_id 変更時、ユーザー訂正)
  pending → identifying   (リトライ)
  unknown → identified    (後でユーザーが選択)
  ```
- **billing_unlocks.expires_at**:
  - INSERT 時に SKU で決定: `ai_credits_20`/`pdf_export`/`pwyw_*` はすべて NULL (永続)
  - 将来 subscription 追加時のみ expires_at を活用 (現状は予約フィールド)

### 6.3 ログ・分析 (analytics)
- **api_usage**: §4.6.2 の中核。Edge Function or アプリケーション層で 1 リクエスト = 1 行 INSERT
- **集計クエリ** (`api_usage_monthly` マテビュー):
  ```sql
  CREATE MATERIALIZED VIEW api_usage_monthly AS
  SELECT
    user_id,
    date_trunc('month', created_at) AS year_month,
    service,
    SUM(input_tokens) AS total_input_tokens,
    SUM(output_tokens) AS total_output_tokens,
    SUM(image_count) AS total_image_count,
    COUNT(*) AS total_calls,
    AVG(CASE WHEN success THEN 1.0 ELSE 0.0 END) AS success_rate
  FROM api_usage
  GROUP BY user_id, date_trunc('month', created_at), service;
  ```
- **コスト算出**: アプリケーション層で `.env` 単価と乗算 (DB 内に単価を持たない)
- **日次 refresh**: cron extension or Edge Function scheduled

## 7. スコープ外
- アプリケーション層の Supabase クライアントラッパ実装 → `_shared/auth`, `_shared/storage`, `_shared/ai` で担当
- 月次バッチ実行基盤 → `_shared/analytics` で担当
- Stripe Webhook ハンドラ → `billing` 機能で担当
- 監査ログ (誰がいつ何を変更したか) → 単一 user 個人ノートのため不要 (Q12.7 (4) で確定)

## 8. 未決事項

> 現時点で論点なし (2026-05-22)
>
> 関連する未決論点は concept.md §8 を参照: [論点-006] 匿名 SPAM 抑止策、[論点-007] 匿名→リンク時データ移行戦略。これらは本 SPEC の構造には影響せず、`account` / `billing` 機能側で運用ロジックを設計する。

## 9. 更新履歴
| 日付 | 変更概要 | 実行者 |
|---|---|---|
| 2026-05-22 | 初版作成 (8 テーブル + RLS + マテビュー + enum) | /flow:feature |

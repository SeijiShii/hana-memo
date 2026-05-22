# _shared/db 仕様書

> **役割**: Neon Postgres スキーマ + Drizzle ORM + マイグレーション + アクセス制御方針
> **タグ**: cross-cutting / 基盤 / data-layer
> **最終更新**: 2026-05-22 (BaaS Pivot 反映、D20260522-114)
> **入力アーティファクト**: `../../concept.md` §5, §4.2, §4.3, `../../AI_LOG/D20260522_016_concept_baas_pivot.md`

---

## 1. 提供インターフェース

### 1.1 Drizzle Schema (`src/shared/db/schema.ts`)

全テーブルを単一スキーマファイルに定義し、`drizzle-kit generate` で SQL マイグレーション自動生成。

| エクスポート | 種別 | 説明 |
|---|---|---|
| `users` | pgTable | アプリ拡張 user (Clerk から Webhook 同期) |
| `plants` | pgTable | 植物マスタ (共有、書き込みは Vercel Function のみ) |
| `discoveries` | pgTable | 発見レコード (撮影 + AI 結果 + 編集) |
| `images` | pgTable | 画像メタ (R2 object_key を含む) |
| `apiUsage` | pgTable | OpenAI 呼出ログ (コスト集計源泉) |
| `billingUnlocks` | pgTable | Stripe 決済履歴 (append-only) |
| `userSettings` | pgTable | ユーザー設定 |
| `consentLogs` | pgTable | 同意ログ (append-only、user_id NULL 化対応) |
| `discoveryEdits` | pgTable | 編集履歴 (append-only) |
| `apiUsageMonthly` | pgView | 月次集計ビュー (matview or normal view) |

### 1.2 DB クライアント (`src/shared/db/client.ts`)

| 関数/型 | シグネチャ | 説明 |
|---|---|---|
| `db` | `NeonHttpDatabase` | Vercel Function 内で使うシングルトンクライアント (`drizzle-orm/neon-http`、edge runtime 互換) |
| `dbPool` | `NodePgDatabase` (任意) | 長時間接続が必要なバッチ用 (`drizzle-orm/node-postgres` + Neon pooler) |

### 1.3 アクセス制御ヘルパ (`src/shared/db/access.ts`)

| 関数 | シグネチャ | 説明 |
|---|---|---|
| `withUserScope` | `<T>(userId: string, fn: (scope: Scope) => Promise<T>) => Promise<T>` | userId を必ず scope.userId に閉じ込めて Drizzle クエリを実行する高階関数 |
| `assertOwner` | `(row: { user_id: string }, userId: string) => void` | フェッチ後の所有者検証 (防御線) |

> **方針**: Supabase RLS の `auth.uid()` 自動制限は使わない。Vercel Function で Clerk JWT 検証 → ctx.userId 取得 → Drizzle クエリで明示的に `where user_id = ctx.userId` を強制する。Postgres RLS も Neon サポートだが、二重防御は MVP では不要。

## 2. 入出力

### 2.1 副作用
- Postgres DB 操作 (SELECT/INSERT/UPDATE/DELETE)
- Drizzle ログ (debug 時)

### 2.2 マイグレーション
- `drizzle-kit generate` で `drizzle/migrations/<n>_<name>.sql` 自動生成
- `drizzle-kit migrate` で apply (CI / local 両方)

## 3. データモデル (Drizzle Schema 概要)

### 3.1 users
```ts
pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  clerkUserId: text('clerk_user_id').notNull().unique(),
  email: text('email'),
  isAnonymous: boolean('is_anonymous').notNull().default(true),
  linkedAt: timestamp('linked_at', { withTimezone: true }),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
  deletionReason: text('deletion_reason'),
  fingerprintHash: text('fingerprint_hash'),
  trialUsedCount: integer('trial_used_count').notNull().default(0),
  aiCreditsRemaining: integer('ai_credits_remaining').notNull().default(0),
  pdfUnlocked: boolean('pdf_unlocked').notNull().default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});
// CHECK: ai_credits_remaining >= 0 / trial_used_count >= 0
```

### 3.2 plants (将来用マスタ、MVP では未使用)
```ts
pgTable('plants', {
  id: uuid('id').primaryKey().defaultRandom(),
  scientificName: text('scientific_name').notNull().unique(),
  commonNameJa: text('common_name_ja'),
  family: text('family'),
  genus: text('genus'),
  seasonMonths: integer('season_months').array(),
  careInfo: jsonb('care_info'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});
```

### 3.3 discoveries
```ts
pgEnum('discovery_status', ['identifying', 'identified', 'pending', 'unknown']);

pgTable('discoveries', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  imageId: uuid('image_id').references(() => images.id, { onDelete: 'set null' }),
  capturedAt: timestamp('captured_at', { withTimezone: true }).notNull(),
  locationLat: real('location_lat'),
  locationLng: real('location_lng'),
  season: text('season'),  // 'spring'|'summer'|'autumn'|'winter'
  commonName: text('common_name'),
  scientificName: text('scientific_name'),
  family: text('family'),
  genus: text('genus'),
  keyFeatures: jsonb('key_features'),
  confidence: real('confidence'),
  similarSpecies: jsonb('similar_species'),
  status: discoveryStatus('status').notNull().default('identifying'),
  originalCommonName: text('original_common_name'),
  userOverriddenName: text('user_overridden_name'),
  userNote: text('user_note'),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  userIdIdx: index('discoveries_user_id_idx').on(t.userId),
  capturedAtIdx: index('discoveries_captured_at_idx').on(t.capturedAt.desc()),
  userCapturedIdx: index('discoveries_user_captured_idx').on(t.userId, t.capturedAt.desc()),
  activeUserIdx: index('discoveries_active_user_idx').on(t.userId).where(sql`deleted_at is null`),
}));
```

### 3.4 images
```ts
pgTable('images', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  discoveryId: uuid('discovery_id').references(() => discoveries.id, { onDelete: 'cascade' }),
  r2ObjectKey: text('r2_object_key').notNull(),
  originalSizeBytes: integer('original_size_bytes').notNull(),
  mime: text('mime').notNull().default('image/webp'),
  exifStripped: boolean('exif_stripped').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});
```

### 3.5 apiUsage
```ts
pgTable('api_usage', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'set null' }),
  service: text('service').notNull(),
  endpoint: text('endpoint').notNull(),
  inputTokens: integer('input_tokens').notNull().default(0),
  outputTokens: integer('output_tokens').notNull().default(0),
  imageCount: integer('image_count').notNull().default(0),
  success: boolean('success').notNull(),
  latencyMs: integer('latency_ms'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  createdAtIdx: index('api_usage_created_at_idx').on(t.createdAt.desc()),
  userCreatedIdx: index('api_usage_user_created_idx').on(t.userId, t.createdAt.desc()),
}));
```

### 3.6 billingUnlocks
```ts
pgEnum('billing_type', ['ai_credits', 'pdf_unlock']);

pgTable('billing_unlocks', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'restrict' }),
  type: billingType('type').notNull(),
  amountJpy: integer('amount_jpy').notNull(),
  stripeCheckoutSessionId: text('stripe_checkout_session_id').notNull().unique(),
  stripePaymentIntentId: text('stripe_payment_intent_id'),
  stripeReceiptUrl: text('stripe_receipt_url'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});
// 全 UPDATE/DELETE を禁止 (DB トリガで実装、append-only)
```

### 3.7 userSettings
```ts
pgEnum('location_precision', ['precise', 'coarse', 'off']);

pgTable('user_settings', {
  userId: uuid('user_id').primaryKey().references(() => users.id, { onDelete: 'cascade' }),
  locationPrecision: locationPrecision('location_precision').notNull().default('coarse'),
  aiConsentRevokedAt: timestamp('ai_consent_revoked_at', { withTimezone: true }),
  analyticsOptIn: boolean('analytics_opt_in').notNull().default(false),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});
```

### 3.8 consentLogs
```ts
pgEnum('doc_type', ['privacy_policy', 'terms_of_service', 'ai_usage', 'cookie_policy']);

pgTable('consent_logs', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'set null' }),  // 撤退時は NULL 化のみ、行は残す
  docType: docType('doc_type').notNull(),
  docVersion: text('doc_version').notNull(),
  agreedAt: timestamp('agreed_at', { withTimezone: true }).notNull().defaultNow(),
  ipHash: text('ip_hash'),
});
// 全 UPDATE/DELETE を禁止
```

### 3.9 discoveryEdits
```ts
pgEnum('edit_field', ['common_name', 'location', 'user_note']);

pgTable('discovery_edits', {
  id: uuid('id').primaryKey().defaultRandom(),
  discoveryId: uuid('discovery_id').notNull().references(() => discoveries.id, { onDelete: 'cascade' }),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  editedAt: timestamp('edited_at', { withTimezone: true }).notNull().defaultNow(),
  fieldName: editField('field_name').notNull(),
  beforeValue: text('before_value'),
  afterValue: text('after_value'),
});
// 全 UPDATE/DELETE 禁止
```

### 3.10 apiUsageMonthly (matview)
```sql
CREATE MATERIALIZED VIEW api_usage_monthly AS
SELECT
  date_trunc('month', created_at) as year_month,
  service, user_id,
  count(*) as call_count,
  sum(input_tokens) as input_tokens,
  sum(output_tokens) as output_tokens,
  sum(image_count) as image_count
FROM api_usage
GROUP BY 1, 2, 3;
CREATE INDEX api_usage_monthly_idx ON api_usage_monthly (year_month desc, user_id);
```

> Vercel Cron で日次 `REFRESH MATERIALIZED VIEW CONCURRENTLY api_usage_monthly` を実行。

## 4. バリデーション・エラー

### 4.1 マイグレーション安全性
| 対象 | ルール | 失敗時 |
|---|---|---|
| カラム追加 | NOT NULL 追加時は default 必須 | drizzle-kit warning |
| 既存カラム rename | drop + add ではなく rename を明示 | ローダブル diff |
| down migration | drizzle-kit は forward only | 手動 SQL 準備 |

### 4.2 エラーケース
| ID | 条件 | 対応 |
|---|---|---|
| E-DB-001 | DATABASE_URL 不正 | Vercel Function 起動失敗、明示エラー |
| E-DB-002 | Neon コンピュート 0 (auto-suspend) | cold start ~500ms、retry なし透過処理 |
| E-DB-003 | UNIQUE 違反 (billing_unlocks session_id) | べき等性確保のため OK、既存行返却 |
| E-DB-004 | CHECK 違反 (ai_credits_remaining < 0) | reject + Sentry alert |
| E-DB-005 | コネクション枯渇 | retry 1 + 429 返却 |

## 5. NFR + 既存連携

### 5.1 NFR
| 項目 | 目標値 | 根拠 |
|---|---|---|
| シンプルクエリ p95 | < 100ms | UX |
| 複雑 join | < 500ms | 一覧表示 SLA |
| Cold start (auto-suspend 復帰) | < 1s | Vercel Function timeout 内 |
| マイグレーション apply | < 30s (Neon main) | デプロイ SLA |

### 5.2 連携
| 連携先 | 種別 | 依存内容 |
|---|---|---|
| `_shared/auth` | Webhook 受信 | Clerk events → users sync |
| `_shared/storage` | image row 作成 | r2_object_key 保存 |
| `_shared/ai` | discoveries / api_usage 書込 | identify-plant Function |
| `_shared/analytics` | api_usage 読込 | matview 集計 |
| 全機能 | CRUD | Drizzle 経由 |

## 6. タグ別追加

### 6.1 基盤
- 全 Vercel Function は `db` シングルトンを import
- `withUserScope` は強制ヘルパ、PR レビューで「素の db を使ってないか」確認

### 6.2 data-layer
- Drizzle schema が SoT、TypeScript 型は infer して再利用 (`_shared/types/domain.ts` で re-export)

## 7. スコープ外
- Postgres RLS (Drizzle 層で防御、MVP 不採用)
- 別 RDBMS (MySQL / MariaDB) サポート
- PgBouncer 自前 (Neon pooler 標準)

## 8. 未決事項
> 現時点で論点なし
>
> 関連: [論点-010] 月次集計 規模拡大時の BigQuery 連携

## 9. 更新履歴
| 日付 | 変更概要 | 実行者 |
|---|---|---|
| 2026-05-22 | 初版作成 (Supabase 前提) | /flow:feature |
| 2026-05-22 | BaaS Pivot: Neon + Drizzle に書換 (D20260522-114) | /flow:concept (UPDATE) |

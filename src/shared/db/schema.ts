// Drizzle Schema — hana-memo
// 全テーブル + enum + matview を単一ファイルに定義。
// drizzle-kit generate で SQL migration が自動生成される。
// 関連: docs/_shared/db/001_db_SPEC.md / concept.md §5.1
import { sql } from 'drizzle-orm';
import {
  boolean,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  real,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core';

// =============================================================================
// Enums
// =============================================================================

export const discoveryStatus = pgEnum('discovery_status', [
  'identifying',
  'identified',
  'pending',
  'unknown',
]);

export const billingType = pgEnum('billing_type', ['ai_credits', 'pdf_unlock']);

export const locationPrecision = pgEnum('location_precision', ['precise', 'coarse', 'off']);

export const docType = pgEnum('doc_type', [
  'privacy_policy',
  'terms_of_service',
  'ai_usage',
  'cookie_policy',
]);

export const editField = pgEnum('edit_field', ['common_name', 'location', 'user_note']);

// =============================================================================
// Tables
// =============================================================================

/**
 * users — Clerk からの Webhook 同期 + アプリ拡張カラム
 */
export const users = pgTable('users', {
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
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

/**
 * plants — 植物マスタ (将来用、MVP では未使用)
 * 書き込みは Vercel Function のみ、ユーザーからの直接 INSERT/UPDATE 禁止
 */
export const plants = pgTable('plants', {
  id: uuid('id').primaryKey().defaultRandom(),
  scientificName: text('scientific_name').notNull().unique(),
  commonNameJa: text('common_name_ja'),
  family: text('family'),
  genus: text('genus'),
  seasonMonths: integer('season_months').array(),
  careInfo: jsonb('care_info'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

/**
 * images — R2 オブジェクトのメタ
 * forward declaration として先に定義 (discoveries が参照)
 */
export const images = pgTable('images', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  r2ObjectKey: text('r2_object_key').notNull(),
  originalSizeBytes: integer('original_size_bytes').notNull(),
  mime: text('mime').notNull().default('image/webp'),
  exifStripped: boolean('exif_stripped').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

/**
 * discoveries — 発見レコード (撮影 + AI 同定結果 + ユーザー編集)
 */
export const discoveries = pgTable(
  'discoveries',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    imageId: uuid('image_id').references(() => images.id, {
      onDelete: 'set null',
    }),
    capturedAt: timestamp('captured_at', { withTimezone: true }).notNull(),
    locationLat: real('location_lat'),
    locationLng: real('location_lng'),
    season: text('season'), // 'spring'|'summer'|'autumn'|'winter'
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
  },
  (t) => ({
    userIdIdx: index('discoveries_user_id_idx').on(t.userId),
    capturedAtIdx: index('discoveries_captured_at_idx').on(t.capturedAt.desc()),
    userCapturedIdx: index('discoveries_user_captured_idx').on(t.userId, t.capturedAt.desc()),
    activeUserIdx: index('discoveries_active_user_idx')
      .on(t.userId)
      .where(sql`deleted_at is null`),
  }),
);

/**
 * api_usage — OpenAI 呼出ログ (コスト集計の源泉、§4.6.2)
 */
export const apiUsage = pgTable(
  'api_usage',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id').references(() => users.id, {
      onDelete: 'set null',
    }),
    service: text('service').notNull(),
    endpoint: text('endpoint').notNull(),
    inputTokens: integer('input_tokens').notNull().default(0),
    outputTokens: integer('output_tokens').notNull().default(0),
    imageCount: integer('image_count').notNull().default(0),
    success: boolean('success').notNull(),
    latencyMs: integer('latency_ms'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    createdAtIdx: index('api_usage_created_at_idx').on(t.createdAt.desc()),
    userCreatedIdx: index('api_usage_user_created_idx').on(t.userId, t.createdAt.desc()),
  }),
);

/**
 * billing_unlocks — Stripe 決済履歴 (append-only、UPDATE/DELETE 禁止トリガ)
 */
export const billingUnlocks = pgTable('billing_unlocks', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'restrict' }),
  type: billingType('type').notNull(),
  amountJpy: integer('amount_jpy').notNull(),
  stripeCheckoutSessionId: text('stripe_checkout_session_id').notNull().unique(),
  stripePaymentIntentId: text('stripe_payment_intent_id'),
  stripeReceiptUrl: text('stripe_receipt_url'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

/**
 * user_settings — ユーザー設定
 */
export const userSettings = pgTable('user_settings', {
  userId: uuid('user_id')
    .primaryKey()
    .references(() => users.id, { onDelete: 'cascade' }),
  locationPrecision: locationPrecision('location_precision').notNull().default('coarse'),
  aiConsentRevokedAt: timestamp('ai_consent_revoked_at', {
    withTimezone: true,
  }),
  analyticsOptIn: boolean('analytics_opt_in').notNull().default(false),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

/**
 * consent_logs — 同意ログ (append-only、撤退時は user_id NULL 化のみ)
 */
export const consentLogs = pgTable('consent_logs', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'set null' }),
  docType: docType('doc_type').notNull(),
  docVersion: text('doc_version').notNull(),
  agreedAt: timestamp('agreed_at', { withTimezone: true }).notNull().defaultNow(),
  ipHash: text('ip_hash'),
});

/**
 * discovery_edits — 編集履歴 (append-only)
 */
export const discoveryEdits = pgTable('discovery_edits', {
  id: uuid('id').primaryKey().defaultRandom(),
  discoveryId: uuid('discovery_id')
    .notNull()
    .references(() => discoveries.id, { onDelete: 'cascade' }),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  editedAt: timestamp('edited_at', { withTimezone: true }).notNull().defaultNow(),
  fieldName: editField('field_name').notNull(),
  beforeValue: text('before_value'),
  afterValue: text('after_value'),
});

/**
 * webhook_dedupe — Webhook idempotency ([SEC-006] 由来、revise sec_001-003 で設計反映)
 * Stripe event.id / Clerk svix_id を PK に UNIQUE 違反でリプレイ拒否
 */
export const webhookDedupe = pgTable(
  'webhook_dedupe',
  {
    id: text('id').primaryKey(), // event.id (Stripe) or svix_id (Clerk)
    source: text('source').notNull(), // 'stripe' | 'clerk'
    receivedAt: timestamp('received_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    receivedAtIdx: index('webhook_dedupe_received_at_idx').on(t.receivedAt),
  }),
);

// =============================================================================
// Re-exports for InferSelectModel / InferInsertModel (used by _shared/types/domain.ts)
// =============================================================================

export const schema = {
  users,
  plants,
  images,
  discoveries,
  apiUsage,
  billingUnlocks,
  userSettings,
  consentLogs,
  discoveryEdits,
  webhookDedupe,
};

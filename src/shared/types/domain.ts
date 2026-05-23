// ドメインモデル型 — Drizzle schema から InferSelectModel / InferInsertModel で派生
// 関連: docs/_shared/types/001_types_SPEC.md §1.3
// BaaS Pivot 後: Supabase 自動生成型は廃止、Drizzle infer に統一
import type { InferSelectModel, InferInsertModel } from 'drizzle-orm';
import type {
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
} from '@shared/db/schema';

// === Select (SELECT 結果型) ===
export type User = InferSelectModel<typeof users>;
export type Plant = InferSelectModel<typeof plants>;
export type Image = InferSelectModel<typeof images>;
export type Discovery = InferSelectModel<typeof discoveries>;
export type ApiUsage = InferSelectModel<typeof apiUsage>;
export type BillingUnlock = InferSelectModel<typeof billingUnlocks>;
export type UserSettings = InferSelectModel<typeof userSettings>;
export type ConsentLog = InferSelectModel<typeof consentLogs>;
export type DiscoveryEdit = InferSelectModel<typeof discoveryEdits>;
export type WebhookDedupe = InferSelectModel<typeof webhookDedupe>;

// === Insert (INSERT 用、defaults は省略可) ===
export type UserInsert = InferInsertModel<typeof users>;
export type PlantInsert = InferInsertModel<typeof plants>;
export type ImageInsert = InferInsertModel<typeof images>;
export type DiscoveryInsert = InferInsertModel<typeof discoveries>;
export type ApiUsageInsert = InferInsertModel<typeof apiUsage>;
export type BillingUnlockInsert = InferInsertModel<typeof billingUnlocks>;
export type UserSettingsInsert = InferInsertModel<typeof userSettings>;
export type ConsentLogInsert = InferInsertModel<typeof consentLogs>;
export type DiscoveryEditInsert = InferInsertModel<typeof discoveryEdits>;
export type WebhookDedupeInsert = InferInsertModel<typeof webhookDedupe>;

// === Enum aliases (DB enum を文字列リテラル型として再 export) ===
export type DiscoveryStatus = 'identifying' | 'identified' | 'pending' | 'unknown';
export type BillingType = 'ai_credits' | 'pdf_unlock';
export type LocationPrecision = 'precise' | 'coarse' | 'off';
export type DocType =
  | 'privacy_policy'
  | 'terms_of_service'
  | 'ai_usage'
  | 'cookie_policy';
export type EditField = 'common_name' | 'location' | 'user_note';

// === 派生型 ===
export type LocationCoarse = {
  lat: number;
  lng: number;
  precision_m: number; // 概ね 100m (位置情報粒度設定に従う)
};

export type Season = 'spring' | 'summer' | 'autumn' | 'winter';

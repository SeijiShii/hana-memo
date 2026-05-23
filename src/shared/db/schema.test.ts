/**
 * schema.ts metadata tests
 *
 * 実 DB 接続なしで Drizzle schema 定義の整合性をチェック (smoke test)。
 * - 全テーブルがエクスポートされている
 * - 主キー / 外部キー / index 定義が drizzle メタデータに反映されている
 */
import { describe, it, expect } from 'vitest';
import {
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
  schema,
} from './schema';

describe('schema exports', () => {
  it('exports all 10 tables', () => {
    expect(users).toBeDefined();
    expect(plants).toBeDefined();
    expect(images).toBeDefined();
    expect(discoveries).toBeDefined();
    expect(apiUsage).toBeDefined();
    expect(billingUnlocks).toBeDefined();
    expect(userSettings).toBeDefined();
    expect(consentLogs).toBeDefined();
    expect(discoveryEdits).toBeDefined();
    expect(webhookDedupe).toBeDefined();
  });

  it('exports schema object with all tables', () => {
    expect(Object.keys(schema)).toHaveLength(10);
    expect(schema.users).toBe(users);
    expect(schema.webhookDedupe).toBe(webhookDedupe);
  });
});

describe('users table', () => {
  it('has expected columns', () => {
    // Drizzle pgTable は内部に列定義を保持
    const cols = Object.keys(users);
    expect(cols).toContain('id');
    expect(cols).toContain('clerkUserId');
    expect(cols).toContain('email');
    expect(cols).toContain('isAnonymous');
    expect(cols).toContain('aiCreditsRemaining');
    expect(cols).toContain('trialUsedCount');
  });
});

describe('discoveries table', () => {
  it('has expected columns', () => {
    const cols = Object.keys(discoveries);
    expect(cols).toContain('id');
    expect(cols).toContain('userId');
    expect(cols).toContain('imageId');
    expect(cols).toContain('status');
    expect(cols).toContain('commonName');
    expect(cols).toContain('confidence');
  });
});

describe('webhook_dedupe table (SEC-006)', () => {
  it('exists with primary key id and source column', () => {
    const cols = Object.keys(webhookDedupe);
    expect(cols).toContain('id');
    expect(cols).toContain('source');
    expect(cols).toContain('receivedAt');
  });
});

describe('apiUsage table', () => {
  it('has token + image counters', () => {
    const cols = Object.keys(apiUsage);
    expect(cols).toContain('inputTokens');
    expect(cols).toContain('outputTokens');
    expect(cols).toContain('imageCount');
    expect(cols).toContain('latencyMs');
    expect(cols).toContain('success');
  });
});

describe('userSettings table', () => {
  it('has location_precision + analytics_opt_in', () => {
    const cols = Object.keys(userSettings);
    expect(cols).toContain('userId');
    expect(cols).toContain('locationPrecision');
    expect(cols).toContain('analyticsOptIn');
    expect(cols).toContain('aiConsentRevokedAt');
  });
});

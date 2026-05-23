// 型 sanity tests (compile-time + minimal runtime)
import { describe, it, expect } from 'vitest';
import { isRateLimitedError, isValidationError } from './api';
import type {
  User,
  Discovery,
  DiscoveryStatus,
  BillingType,
  LocationPrecision,
  IdentifyInput,
  IdentifyResult,
  CostLogEntry,
  BillingSku,
  Season,
} from './index';

describe('type aliases compile correctly', () => {
  it('DiscoveryStatus accepts all 4 values', () => {
    const v1: DiscoveryStatus = 'identifying';
    const v2: DiscoveryStatus = 'identified';
    const v3: DiscoveryStatus = 'pending';
    const v4: DiscoveryStatus = 'unknown';
    expect([v1, v2, v3, v4]).toHaveLength(4);
  });

  it('BillingType accepts ai_credits / pdf_unlock', () => {
    const t1: BillingType = 'ai_credits';
    const t2: BillingType = 'pdf_unlock';
    expect([t1, t2]).toEqual(['ai_credits', 'pdf_unlock']);
  });

  it('LocationPrecision accepts 3 values', () => {
    const p1: LocationPrecision = 'precise';
    const p2: LocationPrecision = 'coarse';
    const p3: LocationPrecision = 'off';
    expect([p1, p2, p3]).toHaveLength(3);
  });

  it('Season accepts 4 seasons', () => {
    const seasons: Season[] = ['spring', 'summer', 'autumn', 'winter'];
    expect(seasons).toHaveLength(4);
  });

  it('BillingSku has expected values', () => {
    const skus: BillingSku[] = ['ai_credits_20', 'pdf_unlock_basic', 'pdf_unlock_pwyw'];
    expect(skus).toContain('ai_credits_20');
  });
});

describe('User type structure', () => {
  it('accepts a valid User shape', () => {
    const user: User = {
      id: 'uuid-123',
      clerkUserId: 'user_abc',
      email: null,
      isAnonymous: true,
      linkedAt: null,
      deletedAt: null,
      deletionReason: null,
      fingerprintHash: null,
      trialUsedCount: 0,
      aiCreditsRemaining: 0,
      pdfUnlocked: false,
      createdAt: new Date(),
    };
    expect(user.isAnonymous).toBe(true);
  });
});

describe('Discovery type structure', () => {
  it('accepts a valid Discovery shape with status enum', () => {
    const d: Discovery = {
      id: 'uuid-disc',
      userId: 'uuid-user',
      imageId: null,
      capturedAt: new Date(),
      locationLat: null,
      locationLng: null,
      season: 'spring',
      commonName: null,
      scientificName: null,
      family: null,
      genus: null,
      keyFeatures: null,
      confidence: null,
      similarSpecies: null,
      status: 'identifying',
      originalCommonName: null,
      userOverriddenName: null,
      userNote: null,
      deletedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    expect(d.status).toBe('identifying');
  });
});

describe('IdentifyInput / IdentifyResult', () => {
  it('IdentifyInput accepts minimal required fields', () => {
    const input: IdentifyInput = {
      discoveryId: 'd1',
      imageObjectKey: 'user_abc/img.webp',
      capturedAt: '2026-05-23T10:00:00+09:00',
      season: 'spring',
    };
    expect(input.discoveryId).toBe('d1');
  });

  it('IdentifyResult has all expected fields', () => {
    const result: IdentifyResult = {
      commonName: 'タンポポ',
      scientificName: 'Taraxacum officinale',
      family: 'キク科',
      genus: 'Taraxacum',
      keyFeatures: ['黄色い花', 'ロゼット葉'],
      confidence: 0.92,
      similarSpecies: [],
      status: 'identified',
    };
    expect(result.confidence).toBeGreaterThan(0.5);
  });
});

describe('CostLogEntry', () => {
  it('accepts minimal CostLogEntry', () => {
    const entry: CostLogEntry = {
      service: 'openai',
      endpoint: 'chat/completions',
      success: true,
    };
    expect(entry.service).toBe('openai');
  });
});

describe('isRateLimitedError', () => {
  it('returns true for rate_limited error', () => {
    expect(isRateLimitedError({ error: 'rate_limited', retry_at: 12345 })).toBe(true);
  });

  it('returns false for other errors', () => {
    expect(isRateLimitedError({ error: 'unauthorized' })).toBe(false);
    expect(isRateLimitedError({ error: 'validation_error', reason: 'x' })).toBe(false);
  });

  it('returns false for non-object', () => {
    expect(isRateLimitedError(null)).toBe(false);
    expect(isRateLimitedError('rate_limited')).toBe(false);
  });
});

describe('isValidationError', () => {
  it('returns true for validation_error', () => {
    expect(isValidationError({ error: 'validation_error', reason: 'path' })).toBe(true);
  });

  it('returns false for other errors', () => {
    expect(isValidationError({ error: 'unauthorized' })).toBe(false);
  });
});

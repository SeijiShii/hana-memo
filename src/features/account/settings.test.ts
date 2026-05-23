/**
 * settings.ts 単体テスト
 * 由来: 003_account_UNIT_TEST.md §1.6 (L01〜L03) / §1.7 (AI02/AI03)
 */
import { describe, it, expect } from 'vitest';
import {
  validateLocationPrecision,
  deriveAiConsentChange,
  isAiConsentActive,
  LOCATION_PRECISIONS,
} from './settings';
import { AccountError } from './errors';

describe('validateLocationPrecision', () => {
  it('UT-AC-L01〜L03: precise/coarse/off は通る', () => {
    for (const p of LOCATION_PRECISIONS) {
      expect(validateLocationPrecision(p)).toBe(p);
    }
  });
  it('不正値 → AccountError', () => {
    expect(() => validateLocationPrecision('city')).toThrow(AccountError);
  });
});

describe('deriveAiConsentChange', () => {
  it('UT-AC-AI03: OFF→ON → revoked 解除 + consent log 必要', () => {
    expect(deriveAiConsentChange(true)).toEqual({ aiConsentRevokedAt: null, needsConsentLog: true });
  });
  it('UT-AC-AI02: ON→OFF → revoked_at=now + ログ不要', () => {
    const now = new Date('2026-05-23T00:00:00Z');
    expect(deriveAiConsentChange(false, now)).toEqual({
      aiConsentRevokedAt: now,
      needsConsentLog: false,
    });
  });
});

describe('isAiConsentActive', () => {
  it('revoked_at 未設定 → 有効', () => {
    expect(isAiConsentActive(null)).toBe(true);
    expect(isAiConsentActive(undefined)).toBe(true);
  });
  it('revoked_at set → 無効', () => {
    expect(isAiConsentActive(new Date())).toBe(false);
  });
});

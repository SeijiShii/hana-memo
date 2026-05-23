/**
 * 設定ドメインロジック (位置情報精度 / AI 同意トグル、純関数)
 * 関連: docs/account/001_account_SPEC.md UC3/UC4/UC7, 003_account_UNIT_TEST.md §1.6-§1.8
 */
import { AccountError } from './errors';

export const LOCATION_PRECISIONS = ['precise', 'coarse', 'off'] as const;
export type LocationPrecision = (typeof LOCATION_PRECISIONS)[number];

/** location_precision の検証 (precise/coarse/off 以外は AccountError、UT-AC-L*)。 */
export function validateLocationPrecision(value: string): LocationPrecision {
  if (!(LOCATION_PRECISIONS as readonly string[]).includes(value)) {
    throw new AccountError(`invalid location_precision: ${value}`);
  }
  return value as LocationPrecision;
}

export type AiConsentChange = {
  /** ai_consent_revoked_at に書き込む値 */
  aiConsentRevokedAt: Date | null;
  /** OFF→ON の再同意で consent_logs (ai_usage) INSERT が必要か */
  needsConsentLog: boolean;
};

/**
 * AI 利用同意トグルの結果を導出する (UT-AC-AI02/AI03)。
 * - turnOn (OFF→ON): revoked 解除 + 再同意ログ必要
 * - turnOff (ON→OFF): revoked_at = now、ログ不要
 */
export function deriveAiConsentChange(turnOn: boolean, now: Date = new Date()): AiConsentChange {
  return turnOn
    ? { aiConsentRevokedAt: null, needsConsentLog: true }
    : { aiConsentRevokedAt: now, needsConsentLog: false };
}

/** AI 同意が有効か (revoked_at が未設定なら有効、capture の enforce に使う)。 */
export function isAiConsentActive(aiConsentRevokedAt: Date | null | undefined): boolean {
  return !aiConsentRevokedAt;
}

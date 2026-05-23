/**
 * 価格・数量・クレジット計算 (純関数)
 * 関連: docs/billing/001_billing_SPEC.md §1 UC1/UC2, §4.1
 */
import { InvalidAmountError } from './errors';
import { LinkRequiredError } from '../../shared/auth';

/** AI クレジット: 1 ユニット = 20 回 / ¥100 */
export const AI_CREDITS_PER_UNIT = 20;
export const AI_CREDIT_UNIT_PRICE_JPY = 100;
export const AI_QTY_MIN = 1;
export const AI_QTY_MAX = 10;

/** PDF PWYW: 最低 ¥100 / 推奨 ¥500 / 最大 ¥10000 */
export const PWYW_MIN_JPY = 100;
export const PWYW_PRESET_JPY = 500;
export const PWYW_MAX_JPY = 10000;

/** AI クレジット購入数量の検証 (1-10 整数、UT-BL-CS01〜CS03)。 */
export function validateQuantity(qty: number): number {
  if (!Number.isInteger(qty) || qty < AI_QTY_MIN || qty > AI_QTY_MAX) {
    throw new InvalidAmountError(`quantity must be an integer ${AI_QTY_MIN}-${AI_QTY_MAX}`);
  }
  return qty;
}

/** 購入金額 (¥100 × qty)。 */
export function aiCreditsAmountJpy(qty: number): number {
  return validateQuantity(qty) * AI_CREDIT_UNIT_PRICE_JPY;
}

/** 付与クレジット (20 × qty)。 */
export function aiCreditsGranted(qty: number): number {
  return validateQuantity(qty) * AI_CREDITS_PER_UNIT;
}

/** PWYW 金額の検証 (100-10000 整数 yen、UT-BL-CS04/CS05)。 */
export function validatePwywAmount(yen: number): number {
  if (!Number.isInteger(yen) || yen < PWYW_MIN_JPY || yen > PWYW_MAX_JPY) {
    throw new InvalidAmountError(`amount must be an integer ${PWYW_MIN_JPY}-${PWYW_MAX_JPY} JPY`);
  }
  return yen;
}

/** OAuth リンク必須ガード (匿名 user は購入不可、E-BL-002 / UT-BL-CS06)。 */
export function requireLinked(isLinked: boolean): void {
  if (!isLinked) {
    throw new LinkRequiredError();
  }
}

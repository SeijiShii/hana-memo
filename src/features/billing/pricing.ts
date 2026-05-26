/**
 * 価格・数量・クレジット計算 (純関数)
 * 関連: docs/billing/001_billing_SPEC.md §1 UC1/UC2, §4.1
 */
import { InvalidAmountError } from './errors';

/** AI クレジット: 1 ユニット = 10 回 / ¥100 (revise_001: 旧 20回→10回)。 */
export const AI_CREDITS_PER_UNIT = 10;
export const AI_CREDIT_UNIT_PRICE_JPY = 100;
export const AI_QTY_MIN = 1;
/** revise_001: 1 回の購入上限を ¥100 (qty=1) に縛る (O46 ユーザーリスク上限)。 */
export const AI_QTY_MAX = 1;

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

/** 付与クレジット (10 × qty、revise_001)。 */
export function aiCreditsGranted(qty: number): number {
  return validateQuantity(qty) * AI_CREDITS_PER_UNIT;
}

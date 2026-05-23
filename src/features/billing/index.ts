// billing feature barrel (UI 非依存コア)
// 関連: docs/billing/001_billing_SPEC.md
// Stripe SDK (create-checkout-session/stripe-webhook 署名検証) / React hooks / UI は app bootstrap フェーズで追加
export { BillingError, InvalidAmountError } from './errors';
export {
  AI_CREDITS_PER_UNIT,
  AI_CREDIT_UNIT_PRICE_JPY,
  AI_QTY_MIN,
  AI_QTY_MAX,
  PWYW_MIN_JPY,
  PWYW_PRESET_JPY,
  PWYW_MAX_JPY,
  validateQuantity,
  aiCreditsAmountJpy,
  aiCreditsGranted,
  validatePwywAmount,
  requireLinked,
} from './pricing';
export {
  mapStripeEvent,
  applyBillingWebhook,
  type StripeCheckoutEvent,
  type BillingUnlockOp,
  type BillingUnlockRecord,
  type BillingStore,
} from './webhook';
export {
  REVENUE_CSV_COLUMNS,
  grossMargin,
  buildRevenueCsv,
  type RevenueRow,
} from './revenue';

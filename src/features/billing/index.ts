// billing feature barrel (コア + app bootstrap glue)
// 関連: docs/billing/001_billing_SPEC.md
// Stripe SDK 署名検証 / Checkout 作成は api/billing/ (Vercel Function) に隔離。本 barrel は frontend glue を再輸出。
export {
  BillingError,
  InvalidAmountError,
  CheckoutFailedError,
  CheckoutPendingError,
} from './errors';
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
export { REVENUE_CSV_COLUMNS, grossMargin, buildRevenueCsv, type RevenueRow } from './revenue';
export {
  createCheckout,
  fetchBillingStatus,
  confirmCheckout,
  type CheckoutInput,
  type BillingApiOptions,
  type BillingStatus,
  type ConfirmResult,
  type ConfirmOptions,
} from './api';
export {
  useBillingStatus,
  useAiCredits,
  usePdfUnlocked,
  type UseBillingStatusResult,
} from './hooks';
export { OAuthRequiredModal, type OAuthRequiredModalProps } from './OAuthRequiredModal';
export {
  PwywSelector,
  formatJpy,
  PWYW_SUGGESTED_JPY,
  type PwywSelectorProps,
} from './components/PwywSelector';
export { BillingPage, type BillingPageProps, type BillingProduct } from './pages/BillingPage';
export { BillingSuccessPage, type BillingSuccessPageProps } from './pages/BillingSuccessPage';
export { BillingContainer, type BillingContainerProps } from './BillingContainer';
export {
  BillingSuccessContainer,
  type BillingSuccessContainerProps,
} from './BillingSuccessContainer';

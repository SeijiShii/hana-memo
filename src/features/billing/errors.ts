/**
 * billing 例外型
 * 関連: docs/billing/001_billing_SPEC.md §4
 */
export class BillingError extends Error {
  constructor(public readonly reason: string) {
    super(`Billing: ${reason}`);
    this.name = 'BillingError';
  }
}

/** 数量 / 金額が範囲外 (UT-BL-CS03/CS05) */
export class InvalidAmountError extends BillingError {
  constructor(reason: string) {
    super(reason);
    this.name = 'InvalidAmountError';
  }
}

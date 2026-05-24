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

/** Checkout / Edge Function 呼び出しが失敗 (network / 5xx、UT-BL-A03) */
export class CheckoutFailedError extends BillingError {
  constructor(
    reason: string,
    public override readonly cause?: unknown,
  ) {
    super(reason);
    this.name = 'CheckoutFailedError';
  }
}

/** Webhook 反映待ちのまま poll がタイムアウト (UT-BL-SC02、「処理中、後ほど再表示」) */
export class CheckoutPendingError extends BillingError {
  constructor(reason = 'checkout still processing') {
    super(reason);
    this.name = 'CheckoutPendingError';
  }
}

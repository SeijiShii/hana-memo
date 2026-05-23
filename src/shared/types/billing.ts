// 課金型 (Stripe Checkout + content-unlock)
// 関連: docs/billing/001_billing_SPEC.md, docs/_shared/types/001_types_SPEC.md
import type { BillingType } from './domain';

export type BillingSku =
  | 'ai_credits_20' // +20 AI 同定枠
  | 'pdf_unlock_basic' // PDF 出力アンロック (固定価格)
  | 'pdf_unlock_pwyw'; // PDF 出力 PWYW

export type CheckoutSessionInput = {
  sku: BillingSku;
  amountJpy: number; // PWYW で動的、固定 SKU は予め定義
  successUrl: string;
  cancelUrl: string;
};

export type UnlockResult = {
  type: BillingType;
  amountJpy: number;
  receiptUrl?: string;
  unlockedAt: string;
};

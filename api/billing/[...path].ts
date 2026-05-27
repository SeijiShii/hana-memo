/**
 * billing グループ catch-all (revise_001 function-consolidation)。
 * /api/billing/{confirm,create-checkout-session,status,stripe-webhook} を 1 関数に集約。
 * ロジックは ./_handlers/* に保持。フロント URL 不変。perspectives O49。
 */
import { createGroupRouter } from '../_lib/router';
import confirm from './_handlers/confirm';
import createCheckoutSession from './_handlers/create-checkout-session';
import status from './_handlers/status';
import stripeWebhook from './_handlers/stripe-webhook';

export const config = { runtime: 'nodejs' };

export default createGroupRouter('billing', {
  confirm: confirm.fetch,
  'create-checkout-session': createCheckoutSession.fetch,
  status: status.fetch,
  'stripe-webhook': stripeWebhook.fetch,
});

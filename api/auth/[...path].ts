/** auth グループ catch-all (revise_001)。/api/auth/{guest,spam-check,clerk-webhook}。clerk-webhook は root から移設。 */
import { createGroupRouter } from '../_lib/router';
import guest from './_handlers/guest';
import spamCheck from './_handlers/spam-check';
import clerkWebhook from './_handlers/clerk-webhook';

export const config = { runtime: 'nodejs' };

export default createGroupRouter('auth', {
  guest: guest.fetch,
  'spam-check': spamCheck.fetch,
  'clerk-webhook': clerkWebhook.fetch,
});

/** capture グループ catch-all (revise_001)。/api/capture/{attach,discovery,status}。 */
import { createGroupRouter } from '../_lib/router';
import attach from './_handlers/attach';
import discovery from './_handlers/discovery';
import status from './_handlers/status';

export const config = { runtime: 'nodejs' };

export default createGroupRouter('capture', {
  attach: attach.fetch,
  discovery: discovery.fetch,
  status: status.fetch,
});

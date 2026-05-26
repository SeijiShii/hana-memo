/** cron グループ catch-all (revise_001)。/api/cron/{refresh-matview,check-quota,export-revenue}。vercel.json crons が呼ぶ。 */
import { createGroupRouter } from '../_lib/router';
import refreshMatview from './_handlers/refresh-matview';
import checkQuota from './_handlers/check-quota';
import exportRevenue from './_handlers/export-revenue';

export const config = { runtime: 'nodejs' };

export default createGroupRouter('cron', {
  'refresh-matview': refreshMatview.fetch,
  'check-quota': checkQuota.fetch,
  'export-revenue': exportRevenue.fetch,
});

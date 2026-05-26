/** account グループ catch-all (revise_001)。/api/account/settings。 */
import { createGroupRouter } from '../_lib/router';
import settings from './_handlers/settings';

export const config = { runtime: 'nodejs' };

export default createGroupRouter('account', { settings: settings.fetch });

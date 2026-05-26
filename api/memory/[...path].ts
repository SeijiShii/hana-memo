/** memory グループ catch-all (revise_001)。/api/memory/recommend。 */
import { createGroupRouter } from '../_lib/router';
import recommend from './_handlers/recommend';

export const config = { runtime: 'nodejs' };

export default createGroupRouter('memory', { recommend: recommend.fetch });

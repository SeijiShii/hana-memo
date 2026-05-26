/** legal グループ catch-all (revise_001)。/api/legal/consents。同ドメイン endpoint 追加に備え catch-all 化。 */
import { createGroupRouter } from '../_lib/router';
import consents from './_handlers/consents';

export const config = { runtime: 'nodejs' };

export default createGroupRouter('legal', { consents: consents.fetch });

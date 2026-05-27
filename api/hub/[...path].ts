/**
 * hub グループ catch-all (service-hub 連携、perspectives O48 / [論点-003])。
 * /api/hub/service-info — HUB が pull するアプリ層 service-info (共有シークレット認証)。
 */
import { createGroupRouter } from '../_lib/router';
import serviceInfo from './_handlers/service-info';

export const config = { runtime: 'nodejs' };

export default createGroupRouter('hub', {
  'service-info': serviceInfo.fetch,
});

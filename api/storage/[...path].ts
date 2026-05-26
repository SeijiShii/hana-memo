/**
 * storage グループ catch-all (revise_001 function-consolidation)。
 *
 * `/api/storage/{upload-url,signed-url,delete,meta}` を 1 つの Serverless Function に集約する
 * (Vercel Hobby 12-fn 上限対応、perspectives O49)。各エンドポイントのロジックは
 * `./_handlers/*` に保持し (`_` 前置で Vercel は関数化しない)、action segment で dispatch。
 * フロントの URL (`/api/storage/<action>`) は不変 = 後方互換。
 *
 * 関連: api/_lib/router.ts, docs/_shared/api/revise_001_20260526_function-consolidation/
 */
import { createGroupRouter } from '../_lib/router';
import uploadUrl from './_handlers/upload-url';
import signedUrl from './_handlers/signed-url';
import deleteHandler from './_handlers/delete';
import meta from './_handlers/meta';

export const config = { runtime: 'nodejs' };

export default createGroupRouter('storage', {
  'upload-url': uploadUrl.fetch,
  'signed-url': signedUrl.fetch,
  delete: deleteHandler.fetch,
  meta: meta.fetch,
});

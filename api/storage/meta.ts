/**
 * R2 オブジェクトメタ取得エンドポイント (POST /api/storage/meta)
 *
 * - `{action:'head', objectKey}` → 所有確認 → R2 HEAD → {size, contentType, uploadedAt}
 * - `{action:'list'}` → 認証 user の prefix (`{userId}/`) で ListObjectsV2 → StorageObject[]
 *
 * list は常に JWT から解決した user_id を prefix にするため、他 user の objectKey は列挙されない
 * (UT-ST-M03)。R2 SDK は _lib/r2.ts に隔離。
 *
 * 関連: docs/_shared/storage/001_storage_SPEC.md §1.3/§3.3, 002_storage_PLAN.md Phase 3
 */
import { verifyClerkSession, UnauthorizedError } from '../_lib/clerk';
import { resolveUserId, UserNotFoundError } from '../_lib/user';
import { validateObjectKey, ValidationError } from '../../src/shared/helpers/url';

export type MetaBody = { action: 'head'; objectKey: string } | { action: 'list' };

/** request body を head / list に正規化する (純関数)。 */
export function parseMetaBody(raw: unknown): MetaBody {
  const b = (raw ?? {}) as Record<string, unknown>;
  if (b.action === 'head' && typeof b.objectKey === 'string' && b.objectKey) {
    return { action: 'head', objectKey: b.objectKey };
  }
  if (b.action === 'list') {
    return { action: 'list' };
  }
  throw new ValidationError('invalid meta action');
}

function jsonResponse(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

export const config = { runtime: 'nodejs' };

/** Vercel Web handler。 */
export default async function handler(req: Request): Promise<Response> {
  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 });
  }

  let clerkUserId: string;
  try {
    ({ clerkUserId } = await verifyClerkSession(req));
  } catch (err) {
    return jsonResponse({ error: 'unauthorized' }, err instanceof UnauthorizedError ? err.status : 500);
  }

  let body: MetaBody;
  try {
    body = parseMetaBody(await req.json().catch(() => ({})));
  } catch {
    return jsonResponse({ error: 'bad_request' }, 400);
  }

  try {
    const userId = await resolveUserId(clerkUserId);
    const { createR2MetaClient } = await import('./_lib/r2');
    const meta = createR2MetaClient();
    if (body.action === 'head') {
      validateObjectKey(body.objectKey, userId); // 所有確認 (先頭 segment = user_id)
      const out = await meta.head(body.objectKey);
      return jsonResponse(out, 200);
    }
    const objects = await meta.listByPrefix(`${userId}/`);
    return jsonResponse({ objects }, 200);
  } catch (err) {
    if (err instanceof ValidationError) {
      return jsonResponse({ error: 'forbidden' }, 403);
    }
    if (err instanceof UserNotFoundError) {
      return jsonResponse({ error: 'user_not_found' }, err.status);
    }
    return jsonResponse({ error: 'internal' }, 500);
  }
}

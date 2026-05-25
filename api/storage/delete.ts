/**
 * R2 オブジェクト削除エンドポイント (POST /api/storage/delete)
 *
 * Clerk JWT 検証 → Neon users.id 解決 → `deleteObject` (core) で所有確認 + R2 DeleteObject。
 *
 * 関連: docs/_shared/storage/001_storage_SPEC.md §1.1/§4.1, 002_storage_PLAN.md Phase 3
 */
import { verifyClerkSession, UnauthorizedError } from '../_lib/clerk';
import { resolveUserId, UserNotFoundError } from '../_lib/user';
import { deleteObject } from '../../src/shared/storage/presign';
import { ValidationError } from '../../src/shared/helpers/url';

export type DeleteBody = { objectKey: string };

/** request body を検証して正規化する (純関数)。 */
export function parseDeleteBody(raw: unknown): DeleteBody {
  const b = (raw ?? {}) as Record<string, unknown>;
  if (typeof b.objectKey !== 'string' || !b.objectKey) {
    throw new ValidationError('objectKey required');
  }
  return { objectKey: b.objectKey };
}

function jsonResponse(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

export const config = { runtime: 'nodejs' };

/** Vercel Web handler。 */
async function handler(req: Request): Promise<Response> {
  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 });
  }

  let clerkUserId: string;
  try {
    ({ clerkUserId } = await verifyClerkSession(req));
  } catch (err) {
    return jsonResponse({ error: 'unauthorized' }, err instanceof UnauthorizedError ? err.status : 500);
  }

  let body: DeleteBody;
  try {
    body = parseDeleteBody(await req.json().catch(() => ({})));
  } catch {
    return jsonResponse({ error: 'bad_request' }, 400);
  }

  try {
    const userId = await resolveUserId(clerkUserId);
    const { createR2PresignClient } = await import('./_lib/r2');
    await deleteObject(createR2PresignClient(), { objectKey: body.objectKey, userId });
    return jsonResponse({ ok: true }, 200);
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

export default { fetch: handler };

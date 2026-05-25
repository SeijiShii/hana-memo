/**
 * R2 PUT presigned URL 発行エンドポイント (POST /api/storage/upload-url)
 *
 * Clerk JWT 検証 → Neon users.id 解決 → `createUploadUrl` (core) で入力検証 + key 構築 +
 * PUT presign (5 分 TTL)。image_id はサーバ生成し、objectKey を返す (capture が DB に保存)。
 * R2 SDK は _lib/r2.ts に隔離し dynamic import する。
 *
 * 関連: docs/_shared/storage/001_storage_SPEC.md §1.1/§4.1, 002_storage_PLAN.md Phase 1
 */
import { randomUUID } from 'node:crypto';
import { verifyClerkSession, UnauthorizedError } from '../_lib/clerk';
import { resolveUserId, UserNotFoundError } from '../_lib/user';
import { createUploadUrl } from '../../src/shared/storage/presign';
import { InvalidImageError } from '../../src/shared/storage/errors';

export type UploadUrlBody = { discoveryId: string; contentType: string; sizeBytes: number };

/** request body を検証して正規化する (純関数)。 */
export function parseUploadUrlBody(raw: unknown): UploadUrlBody {
  const b = (raw ?? {}) as Record<string, unknown>;
  const discoveryId = typeof b.discoveryId === 'string' ? b.discoveryId : '';
  const contentType = typeof b.contentType === 'string' ? b.contentType : '';
  const sizeBytes = typeof b.sizeBytes === 'number' ? b.sizeBytes : Number.NaN;
  if (!discoveryId) {
    throw new InvalidImageError('discoveryId is required');
  }
  return { discoveryId, contentType, sizeBytes };
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

  let body: UploadUrlBody;
  try {
    body = parseUploadUrlBody(await req.json().catch(() => ({})));
  } catch (err) {
    return jsonResponse({ error: 'invalid_image', message: (err as Error).message }, 400);
  }

  try {
    const userId = await resolveUserId(clerkUserId);
    const { createR2PresignClient } = await import('./_lib/r2');
    const result = await createUploadUrl(createR2PresignClient(), {
      userId,
      discoveryId: body.discoveryId,
      imageId: randomUUID(),
      contentType: body.contentType,
      sizeBytes: body.sizeBytes,
    });
    return jsonResponse(result, 200);
  } catch (err) {
    if (err instanceof InvalidImageError) {
      return jsonResponse({ error: 'invalid_image', message: err.message }, 400);
    }
    if (err instanceof UserNotFoundError) {
      return jsonResponse({ error: 'user_not_found' }, err.status);
    }
    return jsonResponse({ error: 'internal' }, 500);
  }
}

export default { fetch: handler };

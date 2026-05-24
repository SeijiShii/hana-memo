/**
 * 画像紐付けエンドポイント (POST /api/capture/attach)
 *
 * upload 完了後、images INSERT → discoveries.image_id UPDATE で撮影画像を discovery に紐付ける。
 * Clerk JWT → Neon users.id → user_id スコープ強制 ([SEC-005]、objectKey 所有は upload 時に検証済)。
 *
 * 関連: docs/capture/001_capture_SPEC.md §1 UC1, 003_capture_UNIT_TEST.md §1.4 (UT-CA-A02)
 */
import { verifyClerkSession, UnauthorizedError } from '../_lib/clerk';
import { resolveUserId, UserNotFoundError } from '../_lib/user';
import { validateObjectKey, ValidationError } from '../../src/shared/helpers/url';

export type AttachBody = { discoveryId: string; objectKey: string; sizeBytes: number; mime?: string };

/** request body を検証・正規化する (純関数)。 */
export function parseAttachBody(raw: unknown): AttachBody {
  const b = (raw ?? {}) as Record<string, unknown>;
  const discoveryId = typeof b.discoveryId === 'string' ? b.discoveryId : '';
  const objectKey = typeof b.objectKey === 'string' ? b.objectKey : '';
  const sizeBytes = typeof b.sizeBytes === 'number' ? b.sizeBytes : Number.NaN;
  if (!discoveryId || !objectKey || !Number.isFinite(sizeBytes)) {
    throw new Error('discoveryId / objectKey / sizeBytes are required');
  }
  return {
    discoveryId,
    objectKey,
    sizeBytes,
    mime: typeof b.mime === 'string' ? b.mime : 'image/webp',
  };
}

function jsonResponse(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

async function attachImage(userId: string, body: AttachBody): Promise<void> {
  const [{ db }, { images, discoveries }, { eq, and }] = await Promise.all([
    import('../../src/shared/db/client'),
    import('../../src/shared/db/schema'),
    import('drizzle-orm'),
  ]);
  const inserted = await db
    .insert(images)
    .values({
      userId,
      r2ObjectKey: body.objectKey,
      originalSizeBytes: body.sizeBytes,
      mime: body.mime ?? 'image/webp',
    })
    .returning({ id: images.id });
  const imageId = inserted[0]!.id;
  await db
    .update(discoveries)
    .set({ imageId, updatedAt: new Date() })
    .where(and(eq(discoveries.id, body.discoveryId), eq(discoveries.userId, userId))); // [SEC-005]
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
  let body: AttachBody;
  try {
    body = parseAttachBody(await req.json().catch(() => ({})));
  } catch {
    return jsonResponse({ error: 'bad_request' }, 400);
  }
  try {
    const userId = await resolveUserId(clerkUserId);
    validateObjectKey(body.objectKey, userId); // 所有確認 ([SEC-003]/[SEC-005])
    await attachImage(userId, body);
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

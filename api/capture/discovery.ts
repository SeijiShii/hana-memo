/**
 * discovery 作成 / ロールバック削除エンドポイント (/api/capture/discovery)
 *
 * POST: discoveries INSERT (status=identifying) → discoveryId を返す (撮影パイプライン起点)。
 * DELETE: ?id=... で discoveries を削除 (upload 失敗時のロールバック)。
 * いずれも Clerk JWT → Neon users.id 解決 → user_id スコープ強制 ([SEC-005])。
 *
 * 関連: docs/capture/001_capture_SPEC.md §1 UC1, 003_capture_UNIT_TEST.md §1.4 (UT-CA-A01/A04)
 */
import { verifyClerkSession, UnauthorizedError } from '../_lib/clerk';
import { resolveUserId, UserNotFoundError } from '../_lib/user';
import { sanitizeUserNote } from '../../src/features/capture/note';

export type CreateDiscoveryBody = {
  capturedAt: string;
  season: string;
  location?: { lat: number; lng: number };
  userNote?: string;
};

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

/** request body を検証・正規化する (純関数)。 */
export function parseCreateDiscoveryBody(raw: unknown): CreateDiscoveryBody {
  const b = (raw ?? {}) as Record<string, unknown>;
  const capturedAt = typeof b.capturedAt === 'string' ? b.capturedAt : '';
  const season = typeof b.season === 'string' ? b.season : '';
  if (!capturedAt || !season) {
    throw new Error('capturedAt / season are required');
  }
  const out: CreateDiscoveryBody = { capturedAt, season };
  if (isObject(b.location) && typeof b.location.lat === 'number' && typeof b.location.lng === 'number') {
    out.location = { lat: b.location.lat, lng: b.location.lng };
  }
  const note = sanitizeUserNote(typeof b.userNote === 'string' ? b.userNote : undefined);
  if (note) {
    out.userNote = note;
  }
  return out;
}

function jsonResponse(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

async function insertDiscovery(userId: string, body: CreateDiscoveryBody): Promise<string> {
  const [{ db }, { discoveries }] = await Promise.all([
    import('../../src/shared/db/client'),
    import('../../src/shared/db/schema'),
  ]);
  const rows = await db
    .insert(discoveries)
    .values({
      userId,
      capturedAt: new Date(body.capturedAt),
      season: body.season,
      locationLat: body.location?.lat ?? null,
      locationLng: body.location?.lng ?? null,
      userNote: body.userNote ?? null,
      status: 'identifying',
    })
    .returning({ id: discoveries.id });
  return rows[0]!.id;
}

async function deleteDiscovery(userId: string, discoveryId: string): Promise<void> {
  const [{ db }, { discoveries }, { eq, and }] = await Promise.all([
    import('../../src/shared/db/client'),
    import('../../src/shared/db/schema'),
    import('drizzle-orm'),
  ]);
  await db
    .delete(discoveries)
    .where(and(eq(discoveries.id, discoveryId), eq(discoveries.userId, userId))); // [SEC-005]
}

export const config = { runtime: 'nodejs' };

/** Vercel Web handler。 */
async function handler(req: Request): Promise<Response> {
  let clerkUserId: string;
  try {
    ({ clerkUserId } = await verifyClerkSession(req));
  } catch (err) {
    return jsonResponse({ error: 'unauthorized' }, err instanceof UnauthorizedError ? err.status : 500);
  }

  let userId: string;
  try {
    userId = await resolveUserId(clerkUserId);
  } catch (err) {
    if (err instanceof UserNotFoundError) {
      return jsonResponse({ error: 'user_not_found' }, err.status);
    }
    return jsonResponse({ error: 'internal' }, 500);
  }

  if (req.method === 'POST') {
    let body: CreateDiscoveryBody;
    try {
      body = parseCreateDiscoveryBody(await req.json().catch(() => ({})));
    } catch {
      return jsonResponse({ error: 'bad_request' }, 400);
    }
    try {
      const discoveryId = await insertDiscovery(userId, body);
      return jsonResponse({ discoveryId }, 201);
    } catch {
      return jsonResponse({ error: 'internal' }, 500);
    }
  }

  if (req.method === 'DELETE') {
    const id = new URL(req.url).searchParams.get('id') ?? '';
    if (!id) {
      return jsonResponse({ error: 'bad_request' }, 400);
    }
    try {
      await deleteDiscovery(userId, id);
      return jsonResponse({ ok: true }, 200);
    } catch {
      return jsonResponse({ error: 'internal' }, 500);
    }
  }

  return new Response('Method Not Allowed', { status: 405 });
}

export default { fetch: handler };

/**
 * discovery ステータス取得エンドポイント (GET /api/capture/status?discoveryId=...)
 *
 * useIdentifyStatus が識別完了を poll するための read。Clerk JWT → Neon users.id →
 * user_id スコープ強制 ([SEC-005])。識別結果 (common_name 等) も併せて返す。
 *
 * 関連: docs/capture/001_capture_SPEC.md §3.1, 003_capture_UNIT_TEST.md §1.5 (UT-CA-IS02 poll)
 */
import { verifyClerkSession, UnauthorizedError } from '../_lib/clerk';
import { resolveUserId, UserNotFoundError } from '../_lib/user';
import type { DiscoveryStatus } from '../../src/shared/types/domain';

export type DiscoveryStatusResult = {
  discoveryId: string;
  status: DiscoveryStatus;
  commonName: string | null;
  scientificName: string | null;
  confidence: number | null;
};

function jsonResponse(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

async function fetchStatus(userId: string, discoveryId: string): Promise<DiscoveryStatusResult | null> {
  const [{ db }, { discoveries }, { eq, and }] = await Promise.all([
    import('../../src/shared/db/client'),
    import('../../src/shared/db/schema'),
    import('drizzle-orm'),
  ]);
  const rows = await db
    .select({
      status: discoveries.status,
      commonName: discoveries.commonName,
      scientificName: discoveries.scientificName,
      confidence: discoveries.confidence,
    })
    .from(discoveries)
    .where(and(eq(discoveries.id, discoveryId), eq(discoveries.userId, userId))) // [SEC-005]
    .limit(1);
  const row = rows[0];
  if (!row) {
    return null;
  }
  return {
    discoveryId,
    status: row.status,
    commonName: row.commonName ?? null,
    scientificName: row.scientificName ?? null,
    confidence: row.confidence ?? null,
  };
}

export const config = { runtime: 'nodejs' };

/** Vercel Web handler。 */
export default async function handler(req: Request): Promise<Response> {
  if (req.method !== 'GET') {
    return new Response('Method Not Allowed', { status: 405 });
  }
  const discoveryId = new URL(req.url).searchParams.get('discoveryId') ?? '';
  if (!discoveryId) {
    return jsonResponse({ error: 'bad_request' }, 400);
  }
  let clerkUserId: string;
  try {
    ({ clerkUserId } = await verifyClerkSession(req));
  } catch (err) {
    return jsonResponse({ error: 'unauthorized' }, err instanceof UnauthorizedError ? err.status : 500);
  }
  try {
    const userId = await resolveUserId(clerkUserId);
    const result = await fetchStatus(userId, discoveryId);
    if (!result) {
      return jsonResponse({ error: 'not_found' }, 404);
    }
    return jsonResponse(result, 200);
  } catch (err) {
    if (err instanceof UserNotFoundError) {
      return jsonResponse({ error: 'user_not_found' }, err.status);
    }
    return jsonResponse({ error: 'internal' }, 500);
  }
}

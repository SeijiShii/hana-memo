/**
 * 季節レコメンド取得 (GET /api/memory/recommend) — 「去年の今頃に見た花」
 *
 * Clerk JWT → Neon users.id → 前年同期間 (±15 日) の identified discovery を取得し、tested core
 * `selectLastYearMemories` で最新順・最大 5 件に選定する。soft-delete 除外 + user_id スコープ ([SEC-005])。
 *
 * 関連: docs/memory/001_memory_SPEC.md §1 UC1/UC2, 003_memory_UNIT_TEST.md (E-ME-002/003)
 */
import { verifyClerkSession, UnauthorizedError } from '../_lib/clerk';
import { resolveUserId, UserNotFoundError } from '../_lib/user';
import {
  lastYearWindow,
  selectLastYearMemories,
  type MemoryDiscovery,
} from '../../src/features/memory/recommend';

function jsonResponse(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

async function fetchMemories(userId: string, today: Date): Promise<MemoryDiscovery[]> {
  const { start, end } = lastYearWindow(today);
  const [{ db }, { discoveries }, { eq, and, isNull, gte, lte }] = await Promise.all([
    import('../../src/shared/db/client'),
    import('../../src/shared/db/schema'),
    import('drizzle-orm'),
  ]);
  const rows = await db
    .select({
      id: discoveries.id,
      commonName: discoveries.commonName,
      userOverriddenName: discoveries.userOverriddenName,
      status: discoveries.status,
      capturedAt: discoveries.capturedAt,
      season: discoveries.season,
      locationLat: discoveries.locationLat,
      locationLng: discoveries.locationLng,
    })
    .from(discoveries)
    .where(
      and(
        eq(discoveries.userId, userId), // [SEC-005]
        isNull(discoveries.deletedAt),
        gte(discoveries.capturedAt, start),
        lte(discoveries.capturedAt, end),
      ),
    );
  const mapped: MemoryDiscovery[] = rows.map((r) => ({
    id: r.id,
    commonName: r.userOverriddenName ?? r.commonName,
    status: r.status,
    capturedAt: r.capturedAt.toISOString(),
    season: (r.season ?? 'spring') as MemoryDiscovery['season'],
    location:
      r.locationLat != null && r.locationLng != null
        ? { lat: r.locationLat, lng: r.locationLng }
        : null,
  }));
  return selectLastYearMemories(mapped, today); // identified フィルタ + 最新順 + 上限 5
}

export const config = { runtime: 'nodejs' };

/** Vercel Web handler。 */
export default async function handler(req: Request): Promise<Response> {
  if (req.method !== 'GET') {
    return new Response('Method Not Allowed', { status: 405 });
  }
  let clerkUserId: string;
  try {
    ({ clerkUserId } = await verifyClerkSession(req));
  } catch (err) {
    return jsonResponse({ error: 'unauthorized' }, err instanceof UnauthorizedError ? err.status : 500);
  }
  try {
    const userId = await resolveUserId(clerkUserId);
    return jsonResponse({ memories: await fetchMemories(userId, new Date()) }, 200);
  } catch (err) {
    if (err instanceof UserNotFoundError) {
      return jsonResponse({ error: 'user_not_found' }, err.status);
    }
    return jsonResponse({ error: 'internal' }, 500);
  }
}

/**
 * 発見ノート一覧エンドポイント (GET /api/notebook/list?cursor=&limit=)
 *
 * Clerk JWT → Neon users.id → 当該 user の discoveries を capturedAt 降順で page 取得。
 * soft-delete (deleted_at IS NULL) 除外 + user_id スコープ強制 ([SEC-005]、UT-NB-D06/D07)。
 * フィルタ (季節/月/場所円/keyword) は tested core `filterDiscoveries` を frontend hook で適用する
 * (MVP の DAU 規模では page 取得 + client フィルタで十分、PostGIS 化は Milestone C 検討)。
 *
 * 関連: docs/notebook/001_notebook_SPEC.md §1 UC3, 003_notebook_UNIT_TEST.md §1.1 (UT-NB-D01/D02/D06/D07)
 */
import { verifyClerkSession, UnauthorizedError } from '../_lib/clerk';
import { resolveUserId, UserNotFoundError } from '../_lib/user';
import type { NotebookDiscovery } from '../../src/features/notebook/types';

export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 100;

export type NotebookListResult = {
  items: NotebookDiscovery[];
  nextCursor: string | null;
};

/** limit クエリを 1..100 に clamp する (純関数)。 */
export function clampLimit(raw: string | null): number {
  const n = Number(raw ?? DEFAULT_PAGE_SIZE);
  if (!Number.isFinite(n)) return DEFAULT_PAGE_SIZE;
  return Math.min(MAX_PAGE_SIZE, Math.max(1, Math.floor(n)));
}

/** discoveries ⨝ images の取得行 (leftJoin のため imageObjectKey は nullable)。 */
export type DiscoveryRow = {
  id: string;
  commonName: string | null;
  originalCommonName: string | null;
  userOverriddenName: string | null;
  scientificName: string | null;
  userNote: string | null;
  status: NotebookDiscovery['status'];
  capturedAt: Date;
  season: string | null;
  locationLat: number | null;
  locationLng: number | null;
  imageObjectKey: string | null;
};

/** 取得行を NotebookDiscovery に整形する (純関数、imageObjectKey/location を含む)。 */
export function rowToNotebookDiscovery(r: DiscoveryRow): NotebookDiscovery {
  return {
    id: r.id,
    commonName: r.commonName,
    originalCommonName: r.originalCommonName,
    userOverriddenName: r.userOverriddenName,
    scientificName: r.scientificName,
    userNote: r.userNote,
    status: r.status,
    capturedAt: r.capturedAt.toISOString(),
    season: (r.season ?? 'spring') as NotebookDiscovery['season'],
    location:
      r.locationLat != null && r.locationLng != null
        ? { lat: r.locationLat, lng: r.locationLng }
        : null,
    imageObjectKey: r.imageObjectKey,
  };
}

function jsonResponse(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

async function queryDiscoveries(
  userId: string,
  cursor: string | null,
  limit: number,
): Promise<NotebookListResult> {
  const [{ db }, { discoveries, images }, { eq, and, isNull, lt, desc }] = await Promise.all([
    import('../../src/shared/db/client'),
    import('../../src/shared/db/schema'),
    import('drizzle-orm'),
  ]);
  const conditions = [eq(discoveries.userId, userId), isNull(discoveries.deletedAt)]; // [SEC-005] + soft-delete
  if (cursor) {
    conditions.push(lt(discoveries.capturedAt, new Date(cursor)));
  }
  const rows = await db
    .select({
      id: discoveries.id,
      commonName: discoveries.commonName,
      originalCommonName: discoveries.originalCommonName,
      userOverriddenName: discoveries.userOverriddenName,
      scientificName: discoveries.scientificName,
      userNote: discoveries.userNote,
      status: discoveries.status,
      capturedAt: discoveries.capturedAt,
      season: discoveries.season,
      locationLat: discoveries.locationLat,
      locationLng: discoveries.locationLng,
      imageObjectKey: images.r2ObjectKey, // 画像未添付は null (leftJoin)
    })
    .from(discoveries)
    .leftJoin(images, eq(discoveries.imageId, images.id))
    .where(and(...conditions))
    .orderBy(desc(discoveries.capturedAt))
    .limit(limit + 1); // +1 で次ページ有無を判定

  const hasMore = rows.length > limit;
  const page = hasMore ? rows.slice(0, limit) : rows;
  const items: NotebookDiscovery[] = page.map(rowToNotebookDiscovery);
  const last = page[page.length - 1];
  return {
    items,
    nextCursor: hasMore && last ? last.capturedAt.toISOString() : null,
  };
}

export const config = { runtime: 'nodejs' };

/** Vercel Web handler。 */
async function handler(req: Request): Promise<Response> {
  if (req.method !== 'GET') {
    return new Response('Method Not Allowed', { status: 405 });
  }
  const url = new URL(req.url);
  const cursor = url.searchParams.get('cursor');
  const limit = clampLimit(url.searchParams.get('limit'));

  let clerkUserId: string;
  try {
    ({ clerkUserId } = await verifyClerkSession(req));
  } catch (err) {
    return jsonResponse(
      { error: 'unauthorized' },
      err instanceof UnauthorizedError ? err.status : 500,
    );
  }
  try {
    const userId = await resolveUserId(clerkUserId);
    return jsonResponse(await queryDiscoveries(userId, cursor, limit), 200);
  } catch (err) {
    if (err instanceof UserNotFoundError) {
      return jsonResponse({ error: 'user_not_found' }, err.status);
    }
    return jsonResponse({ error: 'internal' }, 500);
  }
}

export default { fetch: handler };

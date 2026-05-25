/**
 * エクスポート用 discovery データ取得 (GET /api/export/discoveries?month=YYYY-MM)
 *
 * Clerk JWT → Neon users.id → 当該 user の discoveries を CSV 行形に整形して返す。
 * soft-delete (deleted_at IS NULL) 除外 + user_id スコープ ([SEC-005])。frontend が toCsv で
 * CSV 化 / jsPDF で PDF 化する (本 endpoint は純データ供給に徹する)。
 *
 * 関連: docs/export/001_export_SPEC.md §1 UC1/UC2, 003_export_UNIT_TEST.md (E-EX-002)
 */
import { verifyClerkSession, UnauthorizedError } from '../_lib/clerk';
import { resolveUserId, UserNotFoundError } from '../_lib/user';

/** discoveries CSV 行 (DISCOVERY_CSV_COLUMNS 準拠)。 */
export type DiscoveryCsvRow = {
  id: string;
  common_name: string;
  scientific_name: string;
  status: string;
  captured_at: string;
  season: string;
  lat: number | '';
  lng: number | '';
  user_note: string;
};

type DiscoveryRow = {
  id: string;
  commonName: string | null;
  userOverriddenName: string | null;
  scientificName: string | null;
  status: string;
  capturedAt: Date;
  season: string | null;
  locationLat: number | null;
  locationLng: number | null;
  userNote: string | null;
};

/** DB 行を CSV 行に整形する (純関数、表示名は user 編集値優先)。 */
export function toDiscoveryCsvRow(r: DiscoveryRow): DiscoveryCsvRow {
  return {
    id: r.id,
    common_name: r.userOverriddenName ?? r.commonName ?? '',
    scientific_name: r.scientificName ?? '',
    status: r.status,
    captured_at: r.capturedAt.toISOString(),
    season: r.season ?? '',
    lat: r.locationLat ?? '',
    lng: r.locationLng ?? '',
    user_note: r.userNote ?? '',
  };
}

/** month クエリ (YYYY-MM) を検証する (純関数、不正は null)。 */
export function parseMonthParam(raw: string | null): string | null {
  if (!raw) return null;
  return /^\d{4}-\d{2}$/.test(raw) ? raw : null;
}

function jsonResponse(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

async function fetchRows(userId: string, month: string | null): Promise<DiscoveryCsvRow[]> {
  const [{ db }, { discoveries }, { eq, and, isNull, desc, sql }] = await Promise.all([
    import('../../src/shared/db/client'),
    import('../../src/shared/db/schema'),
    import('drizzle-orm'),
  ]);
  const conditions = [eq(discoveries.userId, userId), isNull(discoveries.deletedAt)]; // [SEC-005] + soft-delete
  if (month) {
    conditions.push(sql`to_char(${discoveries.capturedAt}, 'YYYY-MM') = ${month}`);
  }
  const rows = await db
    .select({
      id: discoveries.id,
      commonName: discoveries.commonName,
      userOverriddenName: discoveries.userOverriddenName,
      scientificName: discoveries.scientificName,
      status: discoveries.status,
      capturedAt: discoveries.capturedAt,
      season: discoveries.season,
      locationLat: discoveries.locationLat,
      locationLng: discoveries.locationLng,
      userNote: discoveries.userNote,
    })
    .from(discoveries)
    .where(and(...conditions))
    .orderBy(desc(discoveries.capturedAt));
  return rows.map(toDiscoveryCsvRow);
}

export const config = { runtime: 'nodejs' };

/** Vercel Web handler。 */
async function handler(req: Request): Promise<Response> {
  if (req.method !== 'GET') {
    return new Response('Method Not Allowed', { status: 405 });
  }
  const month = parseMonthParam(new URL(req.url).searchParams.get('month'));
  let clerkUserId: string;
  try {
    ({ clerkUserId } = await verifyClerkSession(req));
  } catch (err) {
    return jsonResponse({ error: 'unauthorized' }, err instanceof UnauthorizedError ? err.status : 500);
  }
  try {
    const userId = await resolveUserId(clerkUserId);
    return jsonResponse({ rows: await fetchRows(userId, month) }, 200);
  } catch (err) {
    if (err instanceof UserNotFoundError) {
      return jsonResponse({ error: 'user_not_found' }, err.status);
    }
    return jsonResponse({ error: 'internal' }, 500);
  }
}

export default { fetch: handler };

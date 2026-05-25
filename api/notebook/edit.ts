/**
 * discovery 編集 / soft-delete エンドポイント (/api/notebook/edit)
 *
 * PATCH: common_name / location / user_note を更新し discovery_edits に before/after を append
 *        (audit、UT-NB-A01/A02)。DELETE: deleted_at = now() の soft-delete (UT-NB-A03)。
 * いずれも user_id スコープ強制 ([SEC-005]、他 user は更新 0 件 = 実質 reject、UT-NB-E01)。
 *
 * 関連: docs/notebook/001_notebook_SPEC.md §1 UC4, 003_notebook_UNIT_TEST.md §1.2 (UT-NB-A01〜A04)
 */
import { verifyClerkSession, UnauthorizedError } from '../_lib/clerk';
import { resolveUserId, UserNotFoundError } from '../_lib/user';
import {
  sanitizeCommonName,
  sanitizeNoteField,
  validateLocation,
} from '../../src/features/notebook/edit';
import { NotebookError } from '../../src/features/notebook/errors';
import type { EditField } from '../../src/shared/types/domain';

export type EditBody =
  | { discoveryId: string; field: 'common_name'; value: string }
  | { discoveryId: string; field: 'user_note'; value: string }
  | { discoveryId: string; field: 'location'; value: { lat: number; lng: number } };

const EDIT_FIELDS: EditField[] = ['common_name', 'location', 'user_note'];

/** request body を検証・正規化する (純関数、UT-NB-A01/A02)。 */
export function parseEditBody(raw: unknown): EditBody {
  const b = (raw ?? {}) as Record<string, unknown>;
  const discoveryId = typeof b.discoveryId === 'string' ? b.discoveryId : '';
  const field = b.field as EditField;
  if (!discoveryId || !EDIT_FIELDS.includes(field)) {
    throw new NotebookError('discoveryId and valid field are required');
  }
  if (field === 'common_name') {
    const value = sanitizeCommonName(typeof b.value === 'string' ? b.value : '');
    if (value === undefined) throw new NotebookError('common_name must not be empty');
    return { discoveryId, field, value };
  }
  if (field === 'user_note') {
    const value = sanitizeNoteField(typeof b.value === 'string' ? b.value : '') ?? '';
    return { discoveryId, field, value };
  }
  const v = b.value as Record<string, unknown> | undefined;
  if (!v || typeof v.lat !== 'number' || typeof v.lng !== 'number') {
    throw new NotebookError('location value requires lat/lng');
  }
  validateLocation(v.lat, v.lng); // NotebookError (範囲外)
  return { discoveryId, field, value: { lat: v.lat, lng: v.lng } };
}

function jsonResponse(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

/** 編集を適用し discovery_edits に audit を残す。更新 0 件 (他 user) は false。 */
async function applyEdit(userId: string, body: EditBody): Promise<boolean> {
  const [{ db }, { discoveries, discoveryEdits }, { eq, and, isNull }] = await Promise.all([
    import('../../src/shared/db/client'),
    import('../../src/shared/db/schema'),
    import('drizzle-orm'),
  ]);
  const scope = and(
    eq(discoveries.id, body.discoveryId),
    eq(discoveries.userId, userId), // [SEC-005]
    isNull(discoveries.deletedAt),
  );
  const current = await db
    .select({
      commonName: discoveries.commonName,
      userNote: discoveries.userNote,
      locationLat: discoveries.locationLat,
      locationLng: discoveries.locationLng,
    })
    .from(discoveries)
    .where(scope)
    .limit(1);
  const row = current[0];
  if (!row) {
    return false; // 他 user or 不在 (UT-NB-E01)
  }

  let beforeValue: string | null;
  let afterValue: string | null;
  if (body.field === 'common_name') {
    beforeValue = row.commonName;
    afterValue = body.value;
    await db
      .update(discoveries)
      .set({ userOverriddenName: body.value, updatedAt: new Date() })
      .where(scope);
  } else if (body.field === 'user_note') {
    beforeValue = row.userNote;
    afterValue = body.value;
    await db.update(discoveries).set({ userNote: body.value, updatedAt: new Date() }).where(scope);
  } else {
    beforeValue = row.locationLat != null ? `${row.locationLat},${row.locationLng}` : null;
    afterValue = `${body.value.lat},${body.value.lng}`;
    await db
      .update(discoveries)
      .set({ locationLat: body.value.lat, locationLng: body.value.lng, updatedAt: new Date() })
      .where(scope);
  }

  await db.insert(discoveryEdits).values({
    discoveryId: body.discoveryId,
    userId,
    fieldName: body.field,
    beforeValue,
    afterValue,
  });
  return true;
}

/** soft-delete (deleted_at=now、UT-NB-A03)。更新 0 件 (他 user) は false。 */
async function softDelete(userId: string, discoveryId: string): Promise<boolean> {
  const [{ db }, { discoveries }, { eq, and, isNull }] = await Promise.all([
    import('../../src/shared/db/client'),
    import('../../src/shared/db/schema'),
    import('drizzle-orm'),
  ]);
  const rows = await db
    .update(discoveries)
    .set({ deletedAt: new Date(), updatedAt: new Date() })
    .where(
      and(eq(discoveries.id, discoveryId), eq(discoveries.userId, userId), isNull(discoveries.deletedAt)),
    )
    .returning({ id: discoveries.id });
  return rows.length > 0;
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

  if (req.method === 'PATCH') {
    let body: EditBody;
    try {
      body = parseEditBody(await req.json().catch(() => ({})));
    } catch {
      return jsonResponse({ error: 'bad_request' }, 400);
    }
    try {
      const ok = await applyEdit(userId, body);
      return ok ? jsonResponse({ ok: true }, 200) : jsonResponse({ error: 'not_found' }, 404);
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
      const ok = await softDelete(userId, id);
      return ok ? jsonResponse({ ok: true }, 200) : jsonResponse({ error: 'not_found' }, 404);
    } catch {
      return jsonResponse({ error: 'internal' }, 500);
    }
  }

  return new Response('Method Not Allowed', { status: 405 });
}

export default { fetch: handler };

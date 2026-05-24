/**
 * notebook frontend API ラッパ (Vercel Function を叩く純粋関数群)
 *
 * - fetchDiscoveries: GET /api/notebook/list (cursor pagination)
 * - updateDiscovery: PATCH /api/notebook/edit (common_name/location/user_note)
 * - softDeleteDiscovery: DELETE /api/notebook/edit?id=
 *
 * 関連: docs/notebook/001_notebook_SPEC.md §1 UC3/UC4, 003_notebook_UNIT_TEST.md §1.1/§1.2
 */
import { NotebookError } from './errors';
import type { NotebookDiscovery } from './types';

export type NotebookApiOptions = {
  token: string;
  fetchFn?: typeof fetch;
};

const LIST_ENDPOINT = '/api/notebook/list';
const EDIT_ENDPOINT = '/api/notebook/edit';

function authHeaders(token: string): Record<string, string> {
  return { authorization: `Bearer ${token}`, 'content-type': 'application/json' };
}

export type NotebookPage = { items: NotebookDiscovery[]; nextCursor: string | null };

/** discovery を 1 ページ取得する (UT-NB-D01/D02)。 */
export async function fetchDiscoveries(
  opts: NotebookApiOptions & { cursor?: string | null; limit?: number },
): Promise<NotebookPage> {
  const fetchFn = opts.fetchFn ?? fetch;
  const params = new URLSearchParams();
  if (opts.cursor) params.set('cursor', opts.cursor);
  if (opts.limit) params.set('limit', String(opts.limit));
  const qs = params.toString();
  const res = await fetchFn(`${LIST_ENDPOINT}${qs ? `?${qs}` : ''}`, {
    method: 'GET',
    headers: authHeaders(opts.token),
  });
  if (!res.ok) {
    throw new NotebookError(`list failed: ${res.status}`);
  }
  return (await res.json()) as NotebookPage;
}

export type EditValue =
  | { field: 'common_name'; value: string }
  | { field: 'user_note'; value: string }
  | { field: 'location'; value: { lat: number; lng: number } };

/** discovery を編集する (UT-NB-A01/A02、403/404 は NotebookError)。 */
export async function updateDiscovery(
  discoveryId: string,
  edit: EditValue,
  opts: NotebookApiOptions,
): Promise<void> {
  const fetchFn = opts.fetchFn ?? fetch;
  const res = await fetchFn(EDIT_ENDPOINT, {
    method: 'PATCH',
    headers: authHeaders(opts.token),
    body: JSON.stringify({ discoveryId, field: edit.field, value: edit.value }),
  });
  if (!res.ok) {
    throw new NotebookError(`update failed: ${res.status}`);
  }
}

/** discovery を soft-delete する (UT-NB-A03)。 */
export async function softDeleteDiscovery(
  discoveryId: string,
  opts: NotebookApiOptions,
): Promise<void> {
  const fetchFn = opts.fetchFn ?? fetch;
  const res = await fetchFn(`${EDIT_ENDPOINT}?id=${encodeURIComponent(discoveryId)}`, {
    method: 'DELETE',
    headers: authHeaders(opts.token),
  });
  if (!res.ok) {
    throw new NotebookError(`delete failed: ${res.status}`);
  }
}

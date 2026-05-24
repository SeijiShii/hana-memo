/**
 * notebookApi.ts 単体テスト (list / edit / soft-delete ラッパ)
 * 由来: docs/notebook/003_notebook_UNIT_TEST.md §1.1/§1.2 (UT-NB-D01/D07, A01/A02/A03)
 */
import { describe, it, expect, vi } from 'vitest';
import { fetchDiscoveries, updateDiscovery, softDeleteDiscovery } from './notebookApi';
import { NotebookError } from './errors';

function jsonRes(body: unknown, status = 200): Response {
  return { ok: status >= 200 && status < 300, status, json: async () => body } as Response;
}

describe('fetchDiscoveries', () => {
  it('UT-NB-D01: items + nextCursor を返す', async () => {
    const fetchFn = vi.fn<typeof fetch>(async () =>
      jsonRes({ items: [{ id: 'd1' }], nextCursor: '2026-04-01T00:00:00Z' }),
    );
    const page = await fetchDiscoveries({ token: 't', fetchFn });
    expect(page.items).toHaveLength(1);
    expect(page.nextCursor).toBe('2026-04-01T00:00:00Z');
    expect(String(fetchFn.mock.calls[0]![0])).toBe('/api/notebook/list');
  });

  it('UT-NB-D02: cursor + limit を query に載せる', async () => {
    const fetchFn = vi.fn<typeof fetch>(async () => jsonRes({ items: [], nextCursor: null }));
    await fetchDiscoveries({ token: 't', fetchFn, cursor: '2026-04-01T00:00:00Z', limit: 20 });
    const url = String(fetchFn.mock.calls[0]![0]);
    expect(url).toContain('cursor=2026-04-01');
    expect(url).toContain('limit=20');
  });

  it('UT-NB-D07: 失敗 → NotebookError', async () => {
    const fetchFn = vi.fn<typeof fetch>(async () => jsonRes({ error: 'internal' }, 500));
    await expect(fetchDiscoveries({ token: 't', fetchFn })).rejects.toBeInstanceOf(NotebookError);
  });
});

describe('updateDiscovery', () => {
  it('UT-NB-A01: common_name PATCH payload', async () => {
    const fetchFn = vi.fn<typeof fetch>(async () => jsonRes({ ok: true }));
    await updateDiscovery('d1', { field: 'common_name', value: 'タンポポ' }, { token: 't', fetchFn });
    const [url, init] = fetchFn.mock.calls[0]!;
    expect(url).toBe('/api/notebook/edit');
    expect(init?.method).toBe('PATCH');
    expect(JSON.parse(String(init?.body))).toEqual({
      discoveryId: 'd1',
      field: 'common_name',
      value: 'タンポポ',
    });
  });

  it('UT-NB-A02: location PATCH payload', async () => {
    const fetchFn = vi.fn<typeof fetch>(async () => jsonRes({ ok: true }));
    await updateDiscovery('d1', { field: 'location', value: { lat: 35, lng: 139 } }, { token: 't', fetchFn });
    expect(JSON.parse(String(fetchFn.mock.calls[0]![1]?.body)).field).toBe('location');
  });

  it('UT-NB-E01: 403/404 → NotebookError', async () => {
    const fetchFn = vi.fn<typeof fetch>(async () => jsonRes({ error: 'not_found' }, 404));
    await expect(
      updateDiscovery('d1', { field: 'user_note', value: 'x' }, { token: 't', fetchFn }),
    ).rejects.toBeInstanceOf(NotebookError);
  });
});

describe('softDeleteDiscovery', () => {
  it('UT-NB-A03: DELETE ?id= で呼ぶ', async () => {
    const fetchFn = vi.fn<typeof fetch>(async () => jsonRes({ ok: true }));
    await softDeleteDiscovery('d1', { token: 't', fetchFn });
    const [url, init] = fetchFn.mock.calls[0]!;
    expect(url).toBe('/api/notebook/edit?id=d1');
    expect(init?.method).toBe('DELETE');
  });
});

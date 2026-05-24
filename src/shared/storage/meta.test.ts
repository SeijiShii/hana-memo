/**
 * meta.ts 単体テスト (getObjectMetadata / listUserImages)
 * 由来: 003_storage_UNIT_TEST.md §1.4 (UT-ST-M01〜M03)
 */
import { describe, it, expect, vi } from 'vitest';
import { getObjectMetadata, listUserImages } from './meta';

describe('getObjectMetadata', () => {
  it('UT-ST-M01: head action で {size, contentType, uploadedAt} を返す', async () => {
    const meta = { size: 123, contentType: 'image/webp', uploadedAt: '2026-01-01T00:00:00.000Z' };
    const fetchFn = vi.fn<typeof fetch>().mockResolvedValue(new Response(JSON.stringify(meta), { status: 200 }));

    const out = await getObjectMetadata('u/d/i.webp', { token: 'tok', fetchFn });

    expect(out).toEqual(meta);
    const body = JSON.parse((fetchFn.mock.calls[0]![1] as RequestInit).body as string);
    expect(body).toEqual({ action: 'head', objectKey: 'u/d/i.webp' });
  });

  it('失敗ステータスは throw', async () => {
    const fetchFn = vi.fn<typeof fetch>().mockResolvedValue(new Response('no', { status: 403 }));
    await expect(getObjectMetadata('u/d/i.webp', { token: 'tok', fetchFn })).rejects.toThrow();
  });
});

describe('listUserImages', () => {
  it('UT-ST-M02: list action で StorageObject[] を返す', async () => {
    const objects = [
      { objectKey: 'u/d/a.webp', size: 10, uploadedAt: '2026-01-01T00:00:00.000Z' },
      { objectKey: 'u/d/b.webp', size: 20, uploadedAt: '2026-01-02T00:00:00.000Z' },
    ];
    const fetchFn = vi
      .fn<typeof fetch>()
      .mockResolvedValue(new Response(JSON.stringify({ objects }), { status: 200 }));

    const out = await listUserImages({ token: 'tok', fetchFn });

    expect(out).toEqual(objects);
  });

  it('UT-ST-M03: list body に userId を含めない (server が JWT から prefix を導出)', async () => {
    const fetchFn = vi
      .fn<typeof fetch>()
      .mockResolvedValue(new Response(JSON.stringify({ objects: [] }), { status: 200 }));

    await listUserImages({ token: 'tok', fetchFn });

    const body = JSON.parse((fetchFn.mock.calls[0]![1] as RequestInit).body as string);
    expect(body).toEqual({ action: 'list' });
    expect(body).not.toHaveProperty('userId');
  });
});

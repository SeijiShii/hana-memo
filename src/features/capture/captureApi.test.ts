/**
 * captureApi.ts 単体テスト (discovery IO ラッパ)
 * 由来: docs/capture/003_capture_UNIT_TEST.md §1.4 (UT-CA-A01〜A04)
 */
import { describe, it, expect, vi } from 'vitest';
import {
  createDiscovery,
  attachImage,
  deleteDiscovery,
  fetchDiscoveryStatus,
} from './captureApi';
import { CaptureError } from './errors';

function jsonRes(body: unknown, status = 200): Response {
  return { ok: status >= 200 && status < 300, status, json: async () => body } as Response;
}

describe('createDiscovery', () => {
  it('UT-CA-A01: 正常 → discoveryId を返す + POST payload', async () => {
    const fetchFn = vi.fn<typeof fetch>(async () => jsonRes({ discoveryId: 'd1' }, 201));
    const id = await createDiscovery(
      { capturedAt: '2026-05-24T00:00:00Z', season: 'spring', userNote: 'メモ' },
      { token: 't', fetchFn },
    );
    expect(id).toBe('d1');
    const [url, init] = fetchFn.mock.calls[0]!;
    expect(url).toBe('/api/capture/discovery');
    expect(init?.method).toBe('POST');
    expect(JSON.parse(String(init?.body))).toMatchObject({ season: 'spring', userNote: 'メモ' });
  });

  it('UT-CA-A04: RLS reject (403) → CaptureError', async () => {
    const fetchFn = vi.fn<typeof fetch>(async () => jsonRes({ error: 'forbidden' }, 403));
    await expect(
      createDiscovery({ capturedAt: '2026-05-24T00:00:00Z', season: 'spring' }, { token: 't', fetchFn }),
    ).rejects.toBeInstanceOf(CaptureError);
  });
});

describe('attachImage', () => {
  it('UT-CA-A02: 正常 → POST attach payload', async () => {
    const fetchFn = vi.fn<typeof fetch>(async () => jsonRes({ ok: true }));
    await attachImage('d1', 'u1/d1/i1.webp', 1234, { token: 't', fetchFn });
    const [url, init] = fetchFn.mock.calls[0]!;
    expect(url).toBe('/api/capture/attach');
    expect(JSON.parse(String(init?.body))).toEqual({
      discoveryId: 'd1',
      objectKey: 'u1/d1/i1.webp',
      sizeBytes: 1234,
    });
  });

  it('失敗 → CaptureError', async () => {
    const fetchFn = vi.fn<typeof fetch>(async () => jsonRes({ error: 'internal' }, 500));
    await expect(attachImage('d1', 'k', 1, { token: 't', fetchFn })).rejects.toBeInstanceOf(
      CaptureError,
    );
  });
});

describe('deleteDiscovery', () => {
  it('DELETE ?id= で呼ぶ', async () => {
    const fetchFn = vi.fn<typeof fetch>(async () => jsonRes({ ok: true }));
    await deleteDiscovery('d1', { token: 't', fetchFn });
    const [url, init] = fetchFn.mock.calls[0]!;
    expect(url).toBe('/api/capture/discovery?id=d1');
    expect(init?.method).toBe('DELETE');
  });
});

describe('fetchDiscoveryStatus', () => {
  it('GET ?discoveryId= で status を取得', async () => {
    const fetchFn = vi.fn<typeof fetch>(async () =>
      jsonRes({
        discoveryId: 'd1',
        status: 'identified',
        commonName: 'タンポポ',
        scientificName: 'Taraxacum',
        confidence: 0.9,
      }),
    );
    const r = await fetchDiscoveryStatus('d1', { token: 't', fetchFn });
    expect(r.status).toBe('identified');
    expect(r.commonName).toBe('タンポポ');
    expect(String(fetchFn.mock.calls[0]![0])).toBe('/api/capture/status?discoveryId=d1');
  });
});

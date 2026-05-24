// @vitest-environment happy-dom
/**
 * exportApi.ts 単体テスト (fetch / CSV 整形 / ブラウザダウンロード)
 * 由来: docs/export/003_export_UNIT_TEST.md (E-EX-002/005)
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import {
  fetchExportRows,
  buildDiscoveryCsv,
  downloadTextFile,
  type DiscoveryCsvRow,
} from './exportApi';
import { ExportError } from './errors';
import { UTF8_BOM } from './csv';

function jsonRes(body: unknown, status = 200): Response {
  return { ok: status >= 200 && status < 300, status, json: async () => body } as Response;
}

const row: DiscoveryCsvRow = {
  id: 'd1',
  common_name: 'タンポポ, 西洋',
  scientific_name: 'Taraxacum',
  status: 'identified',
  captured_at: '2026-04-01T00:00:00Z',
  season: 'spring',
  lat: 35,
  lng: 139,
  user_note: '道端',
};

afterEach(() => {
  vi.restoreAllMocks();
});

describe('fetchExportRows', () => {
  it('GET → rows、month を query に載せる', async () => {
    const fetchFn = vi.fn<typeof fetch>(async () => jsonRes({ rows: [row] }));
    const rows = await fetchExportRows({ token: 't', fetchFn, month: '2026-04' });
    expect(rows).toHaveLength(1);
    expect(String(fetchFn.mock.calls[0]![0])).toBe('/api/export/discoveries?month=2026-04');
  });

  it('失敗 → ExportError', async () => {
    const fetchFn = vi.fn<typeof fetch>(async () => jsonRes({ error: 'internal' }, 500));
    await expect(fetchExportRows({ token: 't', fetchFn })).rejects.toBeInstanceOf(ExportError);
  });
});

describe('buildDiscoveryCsv', () => {
  it('E-EX-005: BOM + ヘッダ + escape されたフィールド', () => {
    const csv = buildDiscoveryCsv([row]);
    expect(csv.startsWith(UTF8_BOM)).toBe(true);
    expect(csv).toContain('id,common_name,scientific_name');
    expect(csv).toContain('"タンポポ, 西洋"'); // カンマ含む → quote
  });
});

describe('downloadTextFile', () => {
  it('createObjectURL + a.click + revoke を呼ぶ', () => {
    const createSpy = vi.fn(() => 'blob:mock');
    const revokeSpy = vi.fn();
    vi.stubGlobal('URL', { createObjectURL: createSpy, revokeObjectURL: revokeSpy });
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    downloadTextFile('out.csv', 'a,b\n1,2');
    expect(createSpy).toHaveBeenCalledOnce();
    expect(clickSpy).toHaveBeenCalledOnce();
    expect(revokeSpy).toHaveBeenCalledWith('blob:mock');
    vi.unstubAllGlobals();
  });
});

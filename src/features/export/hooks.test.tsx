// @vitest-environment happy-dom
/**
 * export/hooks.ts 単体テスト (useExport: CSV / PDF + unlock ガード)
 * 由来: docs/export/003_export_UNIT_TEST.md (E-EX-001/003/004)
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import type { DiscoveryCsvRow } from './exportApi';
import { ExportError } from './errors';

const fetchExportRowsMock = vi.fn();
const downloadTextFileMock = vi.fn();
const downloadBlobMock = vi.fn();

vi.mock('./exportApi', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./exportApi')>();
  return {
    ...actual,
    fetchExportRows: (...a: unknown[]) => fetchExportRowsMock(...a),
    downloadTextFile: (...a: unknown[]) => downloadTextFileMock(...a),
    downloadBlob: (...a: unknown[]) => downloadBlobMock(...a),
  };
});

import { useExport } from './hooks';

function rows(n: number): DiscoveryCsvRow[] {
  return Array.from({ length: n }, (_, i) => ({
    id: `d${i}`,
    common_name: 'x',
    scientific_name: '',
    status: 'identified',
    captured_at: '2026-04-01T00:00:00Z',
    season: 'spring',
    lat: '' as const,
    lng: '' as const,
    user_note: '',
  }));
}

beforeEach(() => {
  fetchExportRowsMock.mockReset();
  downloadTextFileMock.mockReset();
  downloadBlobMock.mockReset();
});

describe('useExport.exportCsv', () => {
  it('fetch → CSV → downloadTextFile', async () => {
    fetchExportRowsMock.mockResolvedValue(rows(2));
    const { result } = renderHook(() => useExport({ token: 't', pdfUnlocked: false }));
    await act(async () => {
      await result.current.exportCsv({ month: '2026-04' });
    });
    expect(fetchExportRowsMock).toHaveBeenCalledOnce();
    expect(downloadTextFileMock).toHaveBeenCalledOnce();
    expect(String(downloadTextFileMock.mock.calls[0]![0])).toContain('2026-04');
  });
});

describe('useExport.exportPdf', () => {
  it('E-EX-004: 未 unlock は ExportError、fetch しない', async () => {
    const renderPdf = vi.fn();
    const { result } = renderHook(() => useExport({ token: 't', pdfUnlocked: false }));
    await act(async () => {
      await expect(result.current.exportPdf(renderPdf)).rejects.toBeInstanceOf(ExportError);
    });
    expect(fetchExportRowsMock).not.toHaveBeenCalled();
    expect(renderPdf).not.toHaveBeenCalled();
  });

  it('E-EX-003: unlock 済だが 0 件 → ExportError', async () => {
    fetchExportRowsMock.mockResolvedValue(rows(0));
    const renderPdf = vi.fn();
    const { result } = renderHook(() => useExport({ token: 't', pdfUnlocked: true }));
    await act(async () => {
      await expect(result.current.exportPdf(renderPdf)).rejects.toBeInstanceOf(ExportError);
    });
    expect(renderPdf).not.toHaveBeenCalled();
  });

  it('unlock 済 + 件数 OK → renderPdf(rows) → downloadBlob', async () => {
    fetchExportRowsMock.mockResolvedValue(rows(3));
    const blob = new Blob(['pdf']);
    const renderPdf = vi.fn(async () => blob);
    const { result } = renderHook(() => useExport({ token: 't', pdfUnlocked: true }));
    await act(async () => {
      await result.current.exportPdf(renderPdf, { period: '2026-04' });
    });
    expect(renderPdf).toHaveBeenCalledWith(rows(3));
    expect(downloadBlobMock).toHaveBeenCalledOnce();
    expect(String(downloadBlobMock.mock.calls[0]![0])).toContain('2026-04');
  });
});

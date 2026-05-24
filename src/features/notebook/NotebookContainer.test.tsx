// @vitest-environment happy-dom
/**
 * NotebookContainer 単体テスト — 実 hook (useNotebook / useMemories / useExport / usePdfUnlocked) の
 * 値を NotebookPage の props-seam に流し込む配線を検証する (hook はモック)。
 * 由来: app-integration wiring (NotebookContainer)
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import type { NotebookDiscovery } from './types';

const useNotebookMock = vi.fn();
const useMemoriesMock = vi.fn();
const usePdfUnlockedMock = vi.fn();
const useExportMock = vi.fn();
const exportCsvMock = vi.fn();

// NotebookPage は ../memory / ../export の presentation (MemoryBadge/ExportButton 等) も import するため、
// importOriginal で実体を保ちつつデータ hook だけ差し替える (部分モック)。
vi.mock('./hooks', () => ({ useNotebook: (...a: unknown[]) => useNotebookMock(...a) }));
vi.mock('../memory', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../memory')>()),
  useMemories: (...a: unknown[]) => useMemoriesMock(...a),
}));
vi.mock('../billing', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../billing')>()),
  usePdfUnlocked: (...a: unknown[]) => usePdfUnlockedMock(...a),
}));
vi.mock('../export', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../export')>()),
  useExport: (...a: unknown[]) => useExportMock(...a),
}));
// useAuthToken は Clerk の useAuth に依存するため、token を明示注入するテストでは未 sign-in 既定でモックする。
vi.mock('../../app/useAuthToken', () => ({
  useAuthToken: () => ({ token: null, isLoaded: true, isSignedIn: false }),
}));

import { NotebookContainer } from './NotebookContainer';

function disc(id: string, commonName: string): NotebookDiscovery {
  return {
    id,
    commonName,
    scientificName: null,
    status: 'identified',
    capturedAt: '2026-05-01T00:00:00Z',
    season: 'spring',
    location: null,
  };
}

function renderContainer(token: string | null) {
  return render(
    <MemoryRouter initialEntries={['/notebook']}>
      <NotebookContainer token={token} />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  useNotebookMock.mockReset();
  useMemoriesMock.mockReset();
  usePdfUnlockedMock.mockReset();
  useExportMock.mockReset();
  exportCsvMock.mockReset();
  useNotebookMock.mockReturnValue({ discoveries: [], loading: false, error: null });
  useMemoriesMock.mockReturnValue({ memories: [], loading: false });
  usePdfUnlockedMock.mockReturnValue({ unlocked: false });
  useExportMock.mockReturnValue({ exportCsv: exportCsvMock, exporting: false, error: null });
});

describe('NotebookContainer', () => {
  it('token あり → useNotebook の discoveries を NotebookPage に流し込んで描画する', () => {
    useNotebookMock.mockReturnValue({
      discoveries: [disc('a', 'タンポポ'), disc('b', 'スミレ')],
      loading: false,
      error: null,
    });
    renderContainer('tok');
    expect(screen.getByText('タンポポ')).toBeTruthy();
    expect(screen.getByText('スミレ')).toBeTruthy();
    // token を hook に渡している。
    expect(useNotebookMock).toHaveBeenCalledWith(expect.objectContaining({ token: 'tok' }));
    expect(useMemoriesMock).toHaveBeenCalledWith(expect.objectContaining({ token: 'tok' }));
  });

  it('exportProps を配線 → 書き出しボタン表示、CSV 書き出しで exportCsv 起動', async () => {
    useNotebookMock.mockReturnValue({
      discoveries: [disc('a', 'タンポポ')],
      loading: false,
      error: null,
    });
    exportCsvMock.mockResolvedValue(undefined);
    renderContainer('tok');
    // ダイアログ未表示時は ExportButton (ヘッダの「書き出す」) のみ存在する → 押して開く。
    fireEvent.click(screen.getByRole('button', { name: '書き出す' }));
    // ダイアログ内の確定「書き出す」を押す → exportCsv (CSV が初期フォーマット)。
    const dialog = screen.getByRole('dialog', { name: 'データを書き出す' });
    fireEvent.click(within(dialog).getByRole('button', { name: '書き出す' }));
    expect(exportCsvMock).toHaveBeenCalledTimes(1);
    // useExport に token と pdfUnlocked を渡している。
    expect(useExportMock).toHaveBeenCalledWith(
      expect.objectContaining({ token: 'tok', pdfUnlocked: false }),
    );
  });

  it('token なし → データ hook を起動せず空状態を描画する', () => {
    renderContainer(null);
    expect(screen.getByText('まだ発見がありません')).toBeTruthy();
    expect(useNotebookMock).not.toHaveBeenCalled();
    // 書き出しボタン (exportProps) も出ない。
    expect(screen.queryByRole('button', { name: '書き出す' })).toBeNull();
  });
});

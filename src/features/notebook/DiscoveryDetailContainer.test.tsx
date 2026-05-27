// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import type { NotebookDiscovery } from './types';

const useNotebookMock = vi.fn();
const useParamsMock = vi.fn();
const getSignedUrlMock = vi.fn();

vi.mock('./hooks', () => ({ useNotebook: (...a: unknown[]) => useNotebookMock(...a) }));
vi.mock('react-router-dom', () => ({
  useParams: () => useParamsMock(),
  useNavigate: () => vi.fn(),
}));
vi.mock('../../app/useAuthToken', () => ({
  useAuthToken: () => ({ token: null, isLoaded: true, isSignedIn: false }),
}));
vi.mock('../../shared/storage/fetch', () => ({
  getSignedUrl: (...a: unknown[]) => getSignedUrlMock(...a),
}));

import { DiscoveryDetailContainer } from './DiscoveryDetailContainer';

const disc: NotebookDiscovery = {
  id: 'd1',
  commonName: 'タンポポ',
  scientificName: 'Taraxacum officinale',
  status: 'identified',
  capturedAt: '2026-05-25T02:32:00.000Z',
  season: 'spring',
  imageObjectKey: 'k1',
};

beforeEach(() => {
  useNotebookMock.mockReset();
  useParamsMock.mockReset();
  getSignedUrlMock.mockReset();
  getSignedUrlMock.mockResolvedValue('https://signed/k1');
});

describe('DiscoveryDetailContainer (revise_001)', () => {
  it('UT-NB-DT02: :id 一致 discovery を詳細表示し、画像署名 URL を解決する', async () => {
    useNotebookMock.mockReturnValue({ discoveries: [disc], loading: false });
    useParamsMock.mockReturnValue({ id: 'd1' });
    render(<DiscoveryDetailContainer token="tok" />);
    expect(screen.getByText('タンポポ')).toBeTruthy();
    await waitFor(() => {
      const img = screen.getByRole('img') as HTMLImageElement;
      expect(img.src).toContain('https://signed/k1');
    });
    expect(getSignedUrlMock).toHaveBeenCalledWith('k1', expect.objectContaining({ token: 'tok' }));
  });

  it('UT-NB-DT03: :id がリストに無い (loading=false) → 見つかりません', () => {
    useNotebookMock.mockReturnValue({ discoveries: [disc], loading: false });
    useParamsMock.mockReturnValue({ id: 'missing' });
    render(<DiscoveryDetailContainer token="tok" />);
    expect(screen.getByText('見つかりませんでした。')).toBeTruthy();
  });

  it('token なし → 見つかりません相当 (データ取得しない)', () => {
    useParamsMock.mockReturnValue({ id: 'd1' });
    render(<DiscoveryDetailContainer token={null} />);
    expect(useNotebookMock).not.toHaveBeenCalled();
  });
});

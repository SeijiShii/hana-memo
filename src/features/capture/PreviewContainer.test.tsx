// @vitest-environment happy-dom
/**
 * PreviewContainer 単体テスト — useImageConvert + useCaptureFlow を PreviewPage.onConfirm に配線する。
 * 「これでよい」で convert → capture が呼ばれ /notebook へ遷移することを検証する (実 IO はモック)。
 * 由来: app-integration wiring (PreviewContainer)
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';

const convertMock = vi.fn();
const captureMock = vi.fn();
const useImageConvertMock = vi.fn();
const useCaptureFlowMock = vi.fn();
const useIdentifyQuotaMock = vi.fn();
const useCurrentUserMock = vi.fn();

vi.mock('./hooks', () => ({
  useImageConvert: () => useImageConvertMock(),
  useCaptureFlow: (...a: unknown[]) => useCaptureFlowMock(...a),
}));
vi.mock('../billing', () => ({
  useIdentifyQuota: (...a: unknown[]) => useIdentifyQuotaMock(...a),
}));
vi.mock('../../shared/auth/hooks', () => ({
  useCurrentUser: () => useCurrentUserMock(),
  useClerkUserId: () => null,
}));
vi.mock('../../app/useAuthToken', () => ({
  useAuthToken: () => ({ token: null, isLoaded: true, isSignedIn: false }),
}));

import { PreviewContainer } from './PreviewContainer';

function renderWithFile(token: string | null, userId: string | null) {
  const file = new File(['x'], 'shot.webp', { type: 'image/webp' });
  return render(
    <MemoryRouter initialEntries={[{ pathname: '/capture/preview', state: { file } }]}>
      <Routes>
        <Route
          path="/capture/preview"
          element={<PreviewContainer token={token} userId={userId} />}
        />
        <Route path="/notebook" element={<div>NOTEBOOK_SCREEN</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  convertMock.mockReset();
  captureMock.mockReset();
  useImageConvertMock.mockReset();
  useCaptureFlowMock.mockReset();
  useIdentifyQuotaMock.mockReset();
  useCurrentUserMock.mockReset();
  useImageConvertMock.mockReturnValue({ convert: convertMock });
  useCaptureFlowMock.mockReturnValue({ capture: captureMock });
  useIdentifyQuotaMock.mockReturnValue({ remaining: 5, mustLink: false });
  useCurrentUserMock.mockReturnValue({ isSignedIn: true, isAnonymous: false, clerkUserId: 'u1' });
});

describe('PreviewContainer', () => {
  it('token+userId あり → 「これでよい」で convert → capture を実行し /notebook へ遷移', async () => {
    const blob = new Blob(['webp'], { type: 'image/webp' });
    convertMock.mockResolvedValue(blob);
    captureMock.mockResolvedValue({ discoveryId: 'd1' });
    renderWithFile('tok', 'u1');
    fireEvent.click(screen.getByRole('button', { name: 'これでよい' }));
    await waitFor(() => expect(captureMock).toHaveBeenCalledTimes(1));
    expect(convertMock).toHaveBeenCalledTimes(1);
    // capture には blob と pipeline 入力 (userId/capturedAt/season) を渡す。
    const [passedBlob, input] = captureMock.mock.calls[0] ?? [];
    expect(passedBlob).toBe(blob);
    expect(input).toMatchObject({ userId: 'u1' });
    expect(input).toHaveProperty('capturedAt');
    expect(input).toHaveProperty('season');
    // useCaptureFlow に token を渡している。
    expect(useCaptureFlowMock).toHaveBeenCalledWith(expect.objectContaining({ token: 'tok' }));
    await waitFor(() => expect(screen.getByText('NOTEBOOK_SCREEN')).toBeTruthy());
  });

  it('token なし → onConfirm 未配線 (capture を呼ばず) で /notebook へ遷移のみ', async () => {
    renderWithFile(null, 'u1');
    fireEvent.click(screen.getByRole('button', { name: 'これでよい' }));
    await waitFor(() => expect(screen.getByText('NOTEBOOK_SCREEN')).toBeTruthy());
    expect(captureMock).not.toHaveBeenCalled();
  });
});

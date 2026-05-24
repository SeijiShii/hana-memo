// @vitest-environment happy-dom
/**
 * CaptureContainer 単体テスト — billing (useAiCredits) / auth 由来の quota・連携状態を CapturePage に配線する。
 * 由来: app-integration wiring (CaptureContainer)
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

const useAiCreditsMock = vi.fn();
const useCurrentUserMock = vi.fn();

vi.mock('../billing', () => ({ useAiCredits: (...a: unknown[]) => useAiCreditsMock(...a) }));
vi.mock('../../shared/auth/hooks', () => ({
  useCurrentUser: () => useCurrentUserMock(),
  useClerkUserId: () => null,
}));
vi.mock('../../app/useAuthToken', () => ({
  useAuthToken: () => ({ token: null, isLoaded: true, isSignedIn: false }),
}));

import { CaptureContainer } from './CaptureContainer';

function renderContainer(token: string | null) {
  return render(
    <MemoryRouter initialEntries={['/capture']}>
      <CaptureContainer token={token} />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  useAiCreditsMock.mockReset();
  useCurrentUserMock.mockReset();
  useAiCreditsMock.mockReturnValue({ credits: 5 });
  useCurrentUserMock.mockReturnValue({ isSignedIn: true, isAnonymous: false, clerkUserId: 'u1' });
});

describe('CaptureContainer', () => {
  it('token あり, quota>0 → 撮影ボタンを描画し useAiCredits に token を渡す', () => {
    renderContainer('tok');
    expect(screen.getByLabelText('植物を撮影 / 画像を選択')).toBeTruthy();
    expect(useAiCreditsMock).toHaveBeenCalledWith(expect.objectContaining({ token: 'tok' }));
  });

  it('匿名 user かつ残 0 → linkRequired で連携誘導 (撮影ボタンを出さない)', () => {
    useAiCreditsMock.mockReturnValue({ credits: 0 });
    useCurrentUserMock.mockReturnValue({ isSignedIn: true, isAnonymous: true, clerkUserId: 'g1' });
    renderContainer('tok');
    // linkRequired 時、CaptureButton は撮影 input ではなく連携導線を出す。
    expect(screen.queryByLabelText('植物を撮影 / 画像を選択')).toBeNull();
  });

  it('token なし → useAiCredits を起動せず既定の CapturePage を描画する', () => {
    renderContainer(null);
    expect(useAiCreditsMock).not.toHaveBeenCalled();
    expect(screen.getByLabelText('植物を撮影 / 画像を選択')).toBeTruthy();
  });
});

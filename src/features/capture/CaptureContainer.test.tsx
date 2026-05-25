// @vitest-environment happy-dom
/**
 * CaptureContainer 単体テスト — billing (useIdentifyQuota) 由来の実効 quota・連携状態を CapturePage に配線する。
 * 由来: app-integration wiring (CaptureContainer) / fix_001 (実効 quota へ切替)
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

const useIdentifyQuotaMock = vi.fn();

vi.mock('../billing', () => ({ useIdentifyQuota: (...a: unknown[]) => useIdentifyQuotaMock(...a) }));
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
  useIdentifyQuotaMock.mockReset();
  useIdentifyQuotaMock.mockReturnValue({ remaining: 3, mustLink: false });
});

describe('CaptureContainer', () => {
  it('token あり, 実効 quota>0 → 撮影ボタンを描画し useIdentifyQuota に token を渡す', () => {
    renderContainer('tok');
    expect(screen.getByLabelText('植物を撮影 / 画像を選択')).toBeTruthy();
    expect(useIdentifyQuotaMock).toHaveBeenCalledWith(expect.objectContaining({ token: 'tok' }));
  });

  it('fix_001: 新規匿名 (remaining=3, mustLink=false) → 撮影ボタンを描画する (「使い切り」を出さない)', () => {
    useIdentifyQuotaMock.mockReturnValue({ remaining: 3, mustLink: false });
    renderContainer('tok');
    expect(screen.getByLabelText('植物を撮影 / 画像を選択')).toBeTruthy();
  });

  it('匿名 trial 使い切り (mustLink=true) → linkRequired で連携誘導 (撮影ボタンを出さない)', () => {
    useIdentifyQuotaMock.mockReturnValue({ remaining: 0, mustLink: true });
    renderContainer('tok');
    expect(screen.queryByLabelText('植物を撮影 / 画像を選択')).toBeNull();
  });

  it('token なし → useIdentifyQuota を起動せず既定の CapturePage を描画する', () => {
    renderContainer(null);
    expect(useIdentifyQuotaMock).not.toHaveBeenCalled();
    expect(screen.getByLabelText('植物を撮影 / 画像を選択')).toBeTruthy();
  });
});

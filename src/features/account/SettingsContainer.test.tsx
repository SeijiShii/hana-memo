// @vitest-environment happy-dom
/**
 * SettingsContainer 単体テスト — auth 由来の連携状態を SettingsPage に反映し、onUpdateSettings seam を配線する。
 * 由来: app-integration wiring (SettingsContainer)
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

const useCurrentUserMock = vi.fn();
vi.mock('../../shared/auth/hooks', () => ({
  useCurrentUser: () => useCurrentUserMock(),
}));

import { SettingsContainer } from './SettingsContainer';

beforeEach(() => {
  useCurrentUserMock.mockReset();
  useCurrentUserMock.mockReturnValue({ isSignedIn: true, isAnonymous: false, email: 'a@example.com' });
});

describe('SettingsContainer', () => {
  it('連携済 (非匿名) → 連携済ステータス + メールを表示する', () => {
    render(<SettingsContainer />);
    expect(screen.getByText(/Google アカウント連携済（a@example.com）/)).toBeTruthy();
    // 連携済はデータ管理 (削除) セクションを出す。
    expect(screen.getByRole('button', { name: 'アカウントを削除' })).toBeTruthy();
  });

  it('匿名 user → 連携 CTA を表示し、削除セクションは案内のみ', () => {
    useCurrentUserMock.mockReturnValue({ isSignedIn: true, isAnonymous: true, email: null });
    render(<SettingsContainer />);
    expect(screen.getByRole('button', { name: 'Google で連携する' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'アカウントを削除' })).toBeNull();
  });

  it('設定操作 → 注入された onUpdateSettings を patch で起動する', async () => {
    const onUpdateSettings = vi.fn().mockResolvedValue(undefined);
    render(<SettingsContainer onUpdateSettings={onUpdateSettings} />);
    // AI 利用同意トグル (settings=null のため初期 ON) を OFF にする → aiConsentRevokedAt を patch。
    fireEvent.click(screen.getByRole('switch', { name: 'AI 利用同意' }));
    await waitFor(() => expect(onUpdateSettings).toHaveBeenCalledTimes(1));
    const patch = onUpdateSettings.mock.calls[0]?.[0];
    expect(patch).toHaveProperty('aiConsentRevokedAt');
  });
});

// @vitest-environment happy-dom
/**
 * BillingContainer 単体テスト — useBillingStatus / createCheckout を BillingPage に配線する。
 * onCheckout が createCheckout を呼び、返却 URL へ redirect seam を起動することを検証する (実 Stripe は叩かない)。
 * 由来: app-integration wiring (BillingContainer)
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

const useBillingStatusMock = vi.fn();
const createCheckoutMock = vi.fn();
const useCurrentUserMock = vi.fn();

vi.mock('./hooks', () => ({ useBillingStatus: (...a: unknown[]) => useBillingStatusMock(...a) }));
vi.mock('./api', () => ({ createCheckout: (...a: unknown[]) => createCheckoutMock(...a) }));
vi.mock('../../shared/auth/hooks', () => ({
  useCurrentUser: () => useCurrentUserMock(),
}));
vi.mock('../../app/useAuthToken', () => ({
  useAuthToken: () => ({ token: null, isLoaded: true, isSignedIn: false }),
}));

import { BillingContainer } from './BillingContainer';

beforeEach(() => {
  useBillingStatusMock.mockReset();
  createCheckoutMock.mockReset();
  useCurrentUserMock.mockReset();
  useBillingStatusMock.mockReturnValue({
    status: { aiCreditsRemaining: 10 },
    loading: false,
    error: null,
  });
  useCurrentUserMock.mockReturnValue({ isSignedIn: true, isAnonymous: false, email: null });
});

describe('BillingContainer', () => {
  it('token あり → useBillingStatus の status を BillingPage に流し込む', () => {
    render(<BillingContainer token="tok" isLinked={true} />);
    expect(screen.getByText(/残 10 回/)).toBeTruthy();
    expect(useBillingStatusMock).toHaveBeenCalledWith(expect.objectContaining({ token: 'tok' }));
  });

  it('購入 → createCheckout を呼び、返却 URL へ redirect seam を起動する', async () => {
    createCheckoutMock.mockResolvedValue({
      url: 'https://checkout.stripe.test/abc',
      sessionId: 's1',
    });
    const redirect = vi.fn();
    render(<BillingContainer token="tok" isLinked={true} redirect={redirect} />);
    fireEvent.click(screen.getByRole('button', { name: '購入する' }));
    await waitFor(() => expect(createCheckoutMock).toHaveBeenCalledTimes(1));
    // AI クレジット (初期タブ) の CheckoutInput を渡している。
    expect(createCheckoutMock).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'ai_credits' }),
      expect.objectContaining({ token: 'tok' }),
    );
    await waitFor(() => expect(redirect).toHaveBeenCalledWith('https://checkout.stripe.test/abc'));
  });

  it('匿名 (未連携) → 購入で OAuth ゲートを出し createCheckout を呼ばない', () => {
    render(<BillingContainer token="tok" isLinked={false} />);
    fireEvent.click(screen.getByRole('button', { name: '購入する' }));
    expect(createCheckoutMock).not.toHaveBeenCalled();
    expect(screen.getByRole('dialog', { name: 'アカウント連携が必要です' })).toBeTruthy();
  });

  it('token なし → status を取得せず no-op onCheckout の BillingPage を描画する', () => {
    render(<BillingContainer token={null} isLinked={true} />);
    expect(useBillingStatusMock).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: '購入する' })).toBeTruthy();
  });
});

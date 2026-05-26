// @vitest-environment happy-dom
/**
 * BillingContainer 単体テスト — useBillingStatus / createCheckout を BillingPage に配線する。
 * onCheckout が createCheckout を呼び、返却 URL へ redirect seam を起動することを検証する (実 Stripe は叩かない)。
 * 由来: app-integration wiring (BillingContainer) / revise_001 (OAuth リンク必須ゲート撤廃、匿名でも購入可)
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

const useBillingStatusMock = vi.fn();
const createCheckoutMock = vi.fn();

vi.mock('./hooks', () => ({ useBillingStatus: (...a: unknown[]) => useBillingStatusMock(...a) }));
vi.mock('./api', () => ({ createCheckout: (...a: unknown[]) => createCheckoutMock(...a) }));
vi.mock('../../app/useAuthToken', () => ({
  useAuthToken: () => ({ token: null, isLoaded: true, isSignedIn: false }),
}));

import { BillingContainer } from './BillingContainer';

beforeEach(() => {
  useBillingStatusMock.mockReset();
  createCheckoutMock.mockReset();
  useBillingStatusMock.mockReturnValue({
    status: { aiCreditsRemaining: 10 },
    loading: false,
    error: null,
  });
});

describe('BillingContainer', () => {
  it('token あり → useBillingStatus の status を BillingPage に流し込む', () => {
    render(<BillingContainer token="tok" />);
    expect(screen.getByText(/残 10 回/)).toBeTruthy();
    expect(useBillingStatusMock).toHaveBeenCalledWith(expect.objectContaining({ token: 'tok' }));
  });

  it('購入 → createCheckout を呼び、返却 URL へ redirect seam を起動する', async () => {
    createCheckoutMock.mockResolvedValue({
      url: 'https://checkout.stripe.test/abc',
      sessionId: 's1',
    });
    const redirect = vi.fn();
    render(<BillingContainer token="tok" redirect={redirect} />);
    fireEvent.click(screen.getByRole('button', { name: '購入する' }));
    await waitFor(() => expect(createCheckoutMock).toHaveBeenCalledTimes(1));
    // AI クレジット (初期タブ) の CheckoutInput を渡している。
    expect(createCheckoutMock).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'ai_credits' }),
      expect.objectContaining({ token: 'tok' }),
    );
    await waitFor(() => expect(redirect).toHaveBeenCalledWith('https://checkout.stripe.test/abc'));
  });

  it('revise_001: 匿名でも購入が直接進む (OAuth ゲートを出さない)', async () => {
    createCheckoutMock.mockResolvedValue({
      url: 'https://checkout.stripe.test/abc',
      sessionId: 's1',
    });
    render(<BillingContainer token="tok" redirect={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: '購入する' }));
    expect(screen.queryByRole('dialog')).toBeNull();
    await waitFor(() => expect(createCheckoutMock).toHaveBeenCalledTimes(1));
  });

  it('token なし → status を取得せず no-op onCheckout の BillingPage を描画する', () => {
    render(<BillingContainer token={null} />);
    expect(useBillingStatusMock).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: '購入する' })).toBeTruthy();
  });
});

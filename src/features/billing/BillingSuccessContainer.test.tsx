// @vitest-environment happy-dom
/**
 * BillingSuccessContainer 単体テスト — confirmCheckout を onConfirm に配線する。
 * 由来: app-integration wiring (BillingSuccessContainer)
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

const confirmCheckoutMock = vi.fn();
vi.mock('./api', () => ({ confirmCheckout: (...a: unknown[]) => confirmCheckoutMock(...a) }));
vi.mock('../../app/useAuthToken', () => ({
  useAuthToken: () => ({ token: null, isLoaded: true, isSignedIn: false }),
}));

import { BillingSuccessContainer } from './BillingSuccessContainer';

function renderAt(token: string | null, search = '?session_id=s1') {
  return render(
    <MemoryRouter initialEntries={[`/billing/success${search}`]}>
      <BillingSuccessContainer token={token} />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  confirmCheckoutMock.mockReset();
});

describe('BillingSuccessContainer', () => {
  it('token あり → session_id で confirmCheckout を呼び、確認結果を表示する', async () => {
    confirmCheckoutMock.mockResolvedValue({
      found: true,
      type: 'ai_credits',
      aiCreditsRemaining: 50,
      pdfUnlocked: false,
    });
    renderAt('tok');
    await waitFor(() =>
      expect(screen.getByRole('heading', { name: '購入が完了しました' })).toBeTruthy(),
    );
    expect(confirmCheckoutMock).toHaveBeenCalledWith(
      's1',
      expect.objectContaining({ token: 'tok' }),
    );
    expect(screen.getByText(/残り回数が 50 回/)).toBeTruthy();
  });

  it('token なし → confirmCheckout を呼ばず「処理中です」表示にフォールバックする', async () => {
    renderAt(null);
    await waitFor(() => expect(screen.getByRole('heading', { name: '処理中です' })).toBeTruthy());
    expect(confirmCheckoutMock).not.toHaveBeenCalled();
  });
});

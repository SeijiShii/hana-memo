// @vitest-environment happy-dom
/**
 * BillingSuccessPage 単体テスト
 * 由来: docs/billing/001_billing_SPEC.md §1 UC1 step6 / §4.2 (E-BL-005),
 *       docs/billing/004_billing_E2E_TEST.md E-BL-1 step5/6
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { BillingSuccessPage, type BillingSuccessPageProps } from './BillingSuccessPage';
import type { ConfirmResult } from '../api';

function renderSuccess(props: BillingSuccessPageProps, search = '?session_id=cs_test_123') {
  render(
    <MemoryRouter initialEntries={[`/billing/success${search}`]}>
      <Routes>
        <Route path="/billing/success" element={<BillingSuccessPage {...props} />} />
        <Route path="/notebook" element={<div>NOTEBOOK_SCREEN</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

const aiConfirmed: Extract<ConfirmResult, { found: true }> = {
  found: true,
  type: 'ai_credits',
  aiCreditsRemaining: 20,
};

describe('BillingSuccessPage', () => {
  it('poll 中は「処理中…」を表示する', () => {
    // resolve しない pending Promise で confirming フェーズに留める
    renderSuccess({ onConfirm: () => new Promise(() => {}) });
    expect(screen.getByRole('status').textContent).toContain('処理中…');
  });

  it('E-BL-1: session_id を onConfirm に渡し、反映確認後に受領メッセージ + 残回数を表示する', async () => {
    const onConfirm = vi.fn().mockResolvedValue(aiConfirmed);
    renderSuccess({ onConfirm });
    await waitFor(() => expect(screen.getByText('購入が完了しました')).toBeTruthy());
    expect(onConfirm).toHaveBeenCalledWith('cs_test_123');
    expect(screen.getByText(/20 回になりました/)).toBeTruthy();
  });

  it('E-BL-005: poll が reject (timeout) → 「処理中です」フォールバック表示', async () => {
    const onConfirm = vi.fn().mockRejectedValue(new Error('pending'));
    renderSuccess({ onConfirm });
    await waitFor(() => expect(screen.getByText('処理中です')).toBeTruthy());
  });

  it('session_id なし → 即「処理中です」フォールバック (onConfirm 未起動)', async () => {
    const onConfirm = vi.fn();
    renderSuccess({ onConfirm }, '');
    await waitFor(() => expect(screen.getByText('処理中です')).toBeTruthy());
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it('「発見ノートへ戻る」で /notebook に遷移できる', async () => {
    renderSuccess({ onConfirm: vi.fn().mockResolvedValue(aiConfirmed) });
    await waitFor(() => expect(screen.getByText('購入が完了しました')).toBeTruthy());
    expect(screen.getByRole('link', { name: '発見ノートへ戻る' })).toBeTruthy();
  });
});

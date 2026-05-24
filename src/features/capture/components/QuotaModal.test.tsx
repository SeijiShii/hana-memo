// @vitest-environment happy-dom
/**
 * QuotaModal 単体テスト
 * 由来: docs/capture/001_capture_SPEC.md §4.2 E-CA-004/005
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { QuotaModal, type QuotaModalReason } from './QuotaModal';

function renderModal(reason: QuotaModalReason, open = true) {
  const onClose = vi.fn();
  render(
    <MemoryRouter initialEntries={['/capture']}>
      <Routes>
        <Route path="/capture" element={<QuotaModal open={open} reason={reason} onClose={onClose} />} />
        <Route path="/billing" element={<div>BILLING_SCREEN</div>} />
      </Routes>
    </MemoryRouter>,
  );
  return { onClose };
}

describe('QuotaModal', () => {
  it('open=false → 何も描画しない', () => {
    renderModal('quota', false);
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('reason=quota → 課金メッセージ + 「課金画面へ」で /billing へ遷移', () => {
    renderModal('quota');
    expect(screen.getByText(/識別回数を使い切りました/)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: '課金画面へ' }));
    expect(screen.getByText('BILLING_SCREEN')).toBeTruthy();
  });

  it('reason=link_required → 連携メッセージ + 「アカウント連携へ」で /billing へ遷移', () => {
    renderModal('link_required');
    expect(screen.getByText(/アカウント連携が必要です/)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'アカウント連携へ' }));
    expect(screen.getByText('BILLING_SCREEN')).toBeTruthy();
  });

  it('「あとで」押下 → onClose 呼出', () => {
    const { onClose } = renderModal('quota');
    fireEvent.click(screen.getByRole('button', { name: 'あとで' }));
    expect(onClose).toHaveBeenCalledOnce();
  });
});

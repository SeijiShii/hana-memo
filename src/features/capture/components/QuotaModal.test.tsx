// @vitest-environment happy-dom
/**
 * QuotaModal 単体テスト
 * 由来: docs/capture/001_capture_SPEC.md §4.2 E-CA-004 (revise_001: 購入導線へ一本化、link_required 廃止)
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { QuotaModal } from './QuotaModal';

function renderModal(open = true) {
  const onClose = vi.fn();
  render(
    <MemoryRouter initialEntries={['/capture']}>
      <Routes>
        <Route path="/capture" element={<QuotaModal open={open} onClose={onClose} />} />
        <Route path="/billing" element={<div>BILLING_SCREEN</div>} />
      </Routes>
    </MemoryRouter>,
  );
  return { onClose };
}

describe('QuotaModal', () => {
  it('open=false → 何も描画しない', () => {
    renderModal(false);
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('購入メッセージ + 「クレジットを追加」で /billing へ遷移', () => {
    renderModal();
    expect(screen.getByText(/使い切りました/)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'クレジットを追加' }));
    expect(screen.getByText('BILLING_SCREEN')).toBeTruthy();
  });

  it('「あとで」押下 → onClose 呼出', () => {
    const { onClose } = renderModal();
    fireEvent.click(screen.getByRole('button', { name: 'あとで' }));
    expect(onClose).toHaveBeenCalledOnce();
  });
});

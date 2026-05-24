// @vitest-environment happy-dom
/**
 * OAuthRequiredModal 単体テスト
 * 由来: docs/billing/003_billing_UNIT_TEST.md §1.7 (UT-BL-OM01/OM02)
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { OAuthRequiredModal } from './OAuthRequiredModal';

describe('OAuthRequiredModal', () => {
  it('UT-BL-OM01: open=true → modal + 「連携する」ボタン表示', () => {
    render(<OAuthRequiredModal open onLink={vi.fn()} />);
    expect(screen.getByRole('dialog')).toBeTruthy();
    expect(screen.getByRole('button', { name: '連携する' })).toBeTruthy();
  });

  it('open=false → 何も描画しない', () => {
    render(<OAuthRequiredModal open={false} onLink={vi.fn()} />);
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('UT-BL-OM02: 「連携する」押下 → onLink 呼出', () => {
    const onLink = vi.fn();
    render(<OAuthRequiredModal open onLink={onLink} />);
    fireEvent.click(screen.getByRole('button', { name: '連携する' }));
    expect(onLink).toHaveBeenCalledOnce();
  });

  it('onClose 指定時「あとで」押下 → onClose 呼出', () => {
    const onClose = vi.fn();
    render(<OAuthRequiredModal open onLink={vi.fn()} onClose={onClose} />);
    fireEvent.click(screen.getByRole('button', { name: 'あとで' }));
    expect(onClose).toHaveBeenCalledOnce();
  });
});

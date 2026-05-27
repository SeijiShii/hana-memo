// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from '@testing-library/react';

const useGuestSessionMock = vi.fn();
vi.mock('./useGuestSession', () => ({
  useGuestSession: (opts: unknown) => useGuestSessionMock(opts),
}));
// getFingerprint は実 fingerprintjs を読まないようスタブ
vi.mock('./spam-guard', () => ({ getFingerprint: vi.fn(async () => 'fp') }));

import { GuestSessionGate } from './GuestSessionGate';

beforeEach(() => useGuestSessionMock.mockReset());

describe('GuestSessionGate', () => {
  it('status=active のとき何も描画しない (null)', () => {
    useGuestSessionMock.mockReturnValue({ status: 'active' });
    const { container } = render(<GuestSessionGate />);
    expect(container.innerHTML).toBe('');
  });

  it('status=signing-in のとき何も描画しない', () => {
    useGuestSessionMock.mockReturnValue({ status: 'signing-in' });
    const { container } = render(<GuestSessionGate />);
    expect(container.innerHTML).toBe('');
  });

  it('status=error のとき fatal 通知 (role=alert) を描画', () => {
    useGuestSessionMock.mockReturnValue({ status: 'error' });
    const { getByRole } = render(<GuestSessionGate />);
    expect(getByRole('alert').textContent).toContain('起動できませんでした');
  });

  it('useGuestSession に getFingerprint を渡す', () => {
    useGuestSessionMock.mockReturnValue({ status: 'idle' });
    render(<GuestSessionGate />);
    const opts = useGuestSessionMock.mock.calls[0]![0] as { getFingerprint?: unknown };
    expect(typeof opts.getFingerprint).toBe('function');
  });
});

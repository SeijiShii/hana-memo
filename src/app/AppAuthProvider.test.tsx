// @vitest-environment happy-dom
/**
 * AppAuthProvider 単体テスト — Clerk キー有無の分岐 (graceful degradation 要件 #1)。
 * 由来: app-integration wiring (missing-Clerk-key の graceful handling)
 */
import { describe, it, expect, vi } from 'vitest';
import type { ReactNode } from 'react';
import { render, screen } from '@testing-library/react';

vi.mock('@clerk/clerk-react', () => ({
  // ClerkProvider は publishableKey を検証せず children を素通しする mock。
  ClerkProvider: ({ children }: { children: ReactNode }) => (
    <div data-testid="clerk-provider">{children}</div>
  ),
}));

import { AppAuthProvider } from './AppAuthProvider';

describe('AppAuthProvider', () => {
  it('publishableKey あり → ClerkProvider で children をラップする', () => {
    render(
      <AppAuthProvider publishableKey="pk_test_x">
        <span>child</span>
      </AppAuthProvider>,
    );
    expect(screen.getByTestId('clerk-provider')).toBeTruthy();
    expect(screen.getByText('child')).toBeTruthy();
    // キーありモードでは未設定通知を出さない。
    expect(screen.queryByRole('note')).toBeNull();
  });

  it('publishableKey なし (env 未設定) → クラッシュせず children + 未設定通知を描画する', () => {
    // prop 無し + テスト環境で VITE_CLERK_PUBLISHABLE_KEY 未設定 → keyless モード。
    render(
      <AppAuthProvider>
        <span>child</span>
      </AppAuthProvider>,
    );
    // ツリーがクラッシュせず children が描画される (graceful degradation)。
    expect(screen.getByText('child')).toBeTruthy();
    // ClerkProvider はマウントされない。
    expect(screen.queryByTestId('clerk-provider')).toBeNull();
    // 開発者向けの未設定通知が出る。
    const note = screen.getByRole('note');
    expect(note.textContent).toContain('VITE_CLERK_PUBLISHABLE_KEY');
  });
});

// @vitest-environment happy-dom
/**
 * provider.tsx 単体テスト (ClerkProvider wrapper + publishableKey ガード)
 * 由来: 001_auth_SPEC.md §1.1, 002_auth_PLAN.md Phase 1
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { ReactNode } from 'react';
import { render, screen } from '@testing-library/react';

vi.mock('@clerk/clerk-react', () => ({
  // ClerkProvider は publishableKey を検証せず children を素通しする mock
  ClerkProvider: ({ children }: { children: ReactNode }) => (
    <div data-testid="clerk-provider">{children}</div>
  ),
}));

import { AuthProvider } from './provider';

// 環境非依存化: ambient .env の VITE_CLERK_PUBLISHABLE_KEY に依存せず、テスト内で env を制御する
// (実 .env に実キーがあっても keyless ケースが壊れないように)。
beforeEach(() => vi.stubEnv('VITE_CLERK_PUBLISHABLE_KEY', ''));
afterEach(() => vi.unstubAllEnvs());

describe('AuthProvider', () => {
  it('publishableKey を渡すと children を描画する', () => {
    render(
      <AuthProvider publishableKey="pk_test_x">
        <span>child</span>
      </AuthProvider>,
    );
    expect(screen.getByTestId('clerk-provider')).toBeTruthy();
    expect(screen.getByText('child')).toBeTruthy();
  });

  it('publishableKey 未設定なら起動エラー', () => {
    // env 未設定かつ prop 無し → throw
    expect(() =>
      render(
        <AuthProvider>
          <span>child</span>
        </AuthProvider>,
      ),
    ).toThrow(/VITE_CLERK_PUBLISHABLE_KEY/);
  });
});

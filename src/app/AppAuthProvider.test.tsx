// @vitest-environment happy-dom
/**
 * AppAuthProvider 単体テスト — Clerk キー有無の分岐 (graceful degradation 要件 #1)。
 * 由来: app-integration wiring (missing-Clerk-key の graceful handling)
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { ReactNode } from 'react';
import { render, screen } from '@testing-library/react';

vi.mock('@clerk/clerk-react', () => ({
  // ClerkProvider は publishableKey を検証せず children を素通しする mock。
  ClerkProvider: ({ children }: { children: ReactNode }) => (
    <div data-testid="clerk-provider">{children}</div>
  ),
  // ClerkAuthBridge が読む hooks (キーあり時のみマウントされる)。
  useAuth: () => ({ isLoaded: true, isSignedIn: false, userId: null, getToken: async () => null }),
  useUser: () => ({ user: null }),
  // GuestSessionGate → useGuestSession が読む。isLoaded:false で effect を早期 return させ、
  // 本テスト (キー分岐の検証) で guest sign-in の副作用 (fetch) を起こさない。
  useSignIn: () => ({ isLoaded: false, signIn: undefined, setActive: undefined }),
}));

import { AppAuthProvider } from './AppAuthProvider';
import { useCurrentUser } from '../shared/auth/hooks';
import { useAuthToken } from './useAuthToken';

// 環境非依存化: keyless ケースは ambient .env の VITE_CLERK_PUBLISHABLE_KEY に依存せず env を制御する
// (実 .env に実キーがあっても keyless 分岐のテストが壊れないように)。keyed ケースは publishableKey prop が優先。
beforeEach(() => vi.stubEnv('VITE_CLERK_PUBLISHABLE_KEY', ''));
afterEach(() => vi.unstubAllEnvs());

/** 実ドメイン hooks を呼ぶ子。keyless で provider 不在でも throw しないことの回帰検証用。 */
function AuthConsumingChild() {
  const user = useCurrentUser();
  const { token } = useAuthToken();
  return <span>{`signed=${user.isSignedIn} token=${token ?? 'null'}`}</span>;
}

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

  it('回帰: keyless で子が useCurrentUser/useAuthToken を呼んでも white-screen しない', () => {
    // 以前は ClerkProvider 不在で Clerk hooks が throw → ツリー全体が空描画 (white-screen) になっていた。
    // 現在は hooks が AuthContext 既定 (KEYLESS_AUTH) を読むため未 sign-in 状態で安全に描画される。
    render(
      <AppAuthProvider>
        <AuthConsumingChild />
      </AppAuthProvider>,
    );
    expect(screen.getByText('signed=false token=null')).toBeTruthy();
  });

  it('keyあり: ClerkAuthBridge 経由で子の認証 hooks が解決する', () => {
    render(
      <AppAuthProvider publishableKey="pk_test_x">
        <AuthConsumingChild />
      </AppAuthProvider>,
    );
    // mock の useAuth/useUser (未 sign-in) が bridge 経由で子に届く。
    expect(screen.getByText('signed=false token=null')).toBeTruthy();
  });
});

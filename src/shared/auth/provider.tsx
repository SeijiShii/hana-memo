/**
 * ClerkProvider wrapper — App.tsx 最上位に配置する認証コンテキスト。
 * publishableKey は frontend 公開可の VITE_CLERK_PUBLISHABLE_KEY から注入する。
 *
 * 関連: docs/_shared/auth/001_auth_SPEC.md §1.1, 002_auth_PLAN.md Phase 1
 */
import { ClerkProvider } from '@clerk/clerk-react';
import type { ReactNode } from 'react';

/** 公開可能キー (pk_test_… / pk_live_…)。secret/webhook キーは Vercel env 側で管理。 */
const PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY as string | undefined;

export type AuthProviderProps = {
  children: ReactNode;
  /** テスト/Storybook 用にキーを明示注入する場合 (省略時は VITE_ 環境変数)。 */
  publishableKey?: string;
};

/**
 * Clerk のコンテキストを供給する。publishableKey 未設定なら起動を止めて明示エラー。
 * (E-AU-001 の前段: そもそも初期化できない構成ミスを早期検知)
 */
export function AuthProvider({ children, publishableKey }: AuthProviderProps) {
  const key = publishableKey ?? PUBLISHABLE_KEY;
  if (!key) {
    throw new Error(
      'VITE_CLERK_PUBLISHABLE_KEY is not set. Copy .env.example to .env.local and fill it in.',
    );
  }
  return <ClerkProvider publishableKey={key}>{children}</ClerkProvider>;
}

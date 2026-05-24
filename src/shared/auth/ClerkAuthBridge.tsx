/**
 * Clerk → AuthSnapshot 橋渡しコンポーネント。
 *
 * `@clerk/clerk-react` の useAuth/useUser を読み取り AuthSnapshot に正規化して AuthContext に供給する。
 * **ClerkProvider の内側 (= キーあり時のみ) でマウントする**こと (内部で Clerk hooks を呼ぶため)。
 * keyless 時はマウントされず、consumer は AuthContext 既定 (KEYLESS_AUTH) を読む。
 *
 * 関連: src/shared/auth/auth-context.ts, src/app/AppAuthProvider.tsx
 */
import { useMemo, type ReactNode } from 'react';
import { useAuth, useUser } from '@clerk/clerk-react';
import { AuthContext, type AuthSnapshot } from './auth-context';

export function ClerkAuthBridge({ children }: { children: ReactNode }) {
  const { isLoaded, isSignedIn, userId, getToken } = useAuth();
  const { user } = useUser();
  const snapshot = useMemo<AuthSnapshot>(
    () => ({
      isLoaded: Boolean(isLoaded),
      isSignedIn: Boolean(isSignedIn),
      userId: userId ?? null,
      email: user?.primaryEmailAddress?.emailAddress ?? null,
      hasExternalAccount: (user?.externalAccounts?.length ?? 0) > 0,
      getToken: async () => (await getToken()) ?? null,
    }),
    [isLoaded, isSignedIn, userId, user, getToken],
  );
  return <AuthContext.Provider value={snapshot}>{children}</AuthContext.Provider>;
}

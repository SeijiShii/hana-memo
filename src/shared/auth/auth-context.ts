/**
 * 認証スナップショット context の primitive — Clerk 非依存 (createContext + hook + 既定値のみ)。
 *
 * ドメイン hooks (useCurrentUser / useClerkUserId / useAuthToken) は本 context **のみ**を読み、
 * `@clerk/clerk-react` を直接呼ばない。Clerk → snapshot の橋渡しは `./ClerkAuthBridge.tsx` が担う。
 * provider 不在 (keyless 起動) でも既定値 KEYLESS_AUTH が使われるため、Clerk hooks の
 * "can only be used within <ClerkProvider>" throw でツリーが white-screen する不具合を防ぐ。
 *
 * 関連: src/shared/auth/ClerkAuthBridge.tsx, src/shared/auth/hooks.ts, src/app/useAuthToken.ts
 */
import { createContext, useContext } from 'react';

export type AuthSnapshot = {
  isLoaded: boolean;
  isSignedIn: boolean;
  userId: string | null;
  email: string | null;
  hasExternalAccount: boolean;
  /** Clerk session JWT を取得する (未 sign-in / keyless は null)。 */
  getToken: () => Promise<string | null>;
};

/** ClerkProvider 不在時の安全な既定 (未 sign-in、token なし)。 */
export const KEYLESS_AUTH: AuthSnapshot = {
  isLoaded: true,
  isSignedIn: false,
  userId: null,
  email: null,
  hasExternalAccount: false,
  getToken: async () => null,
};

/** 既定値 = KEYLESS_AUTH。provider が無くても useContext は throw せず安全側に倒れる。 */
export const AuthContext = createContext<AuthSnapshot>(KEYLESS_AUTH);

/** 認証スナップショットを読む (provider 不在なら KEYLESS_AUTH)。 */
export function useAuthSnapshot(): AuthSnapshot {
  return useContext(AuthContext);
}

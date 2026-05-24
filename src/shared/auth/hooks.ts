/**
 * 認証 React hooks — Clerk の useUser / useAuth を hana-memo のドメイン形に正規化する。
 *
 * - `useClerkUserId`: Vercel Function 認証 (JWT subject) で使う Clerk user id を同期取得
 * - `useCurrentUser`: Clerk user を {clerkUserId, email, isAnonymous, isLoaded, isSignedIn} に整形
 *
 * Neon users との合体 (trial_used_count 等) が要るコンポーネントは別途 `/api/...` を叩く。
 * 関連: docs/_shared/auth/001_auth_SPEC.md §1.1, 002_auth_PLAN.md Phase 5
 */
import { useAuth, useUser } from '@clerk/clerk-react';

export type CurrentUser = {
  isLoaded: boolean;
  isSignedIn: boolean;
  clerkUserId: string | null;
  email: string | null;
  /** email / external account が無い = 匿名 (Guest) とみなす。 */
  isAnonymous: boolean;
};

/** Clerk user id を取得する (未 sign-in は null)。 */
export function useClerkUserId(): string | null {
  const { userId } = useAuth();
  return userId ?? null;
}

/** Clerk の現在 user をドメイン形に正規化して返す。 */
export function useCurrentUser(): CurrentUser {
  const { user, isLoaded, isSignedIn } = useUser();
  const email = user?.primaryEmailAddress?.emailAddress ?? null;
  const hasExternal = (user?.externalAccounts?.length ?? 0) > 0;
  return {
    isLoaded,
    isSignedIn: Boolean(isSignedIn),
    clerkUserId: user?.id ?? null,
    email,
    isAnonymous: Boolean(user) && !email && !hasExternal,
  };
}

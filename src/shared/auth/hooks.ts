/**
 * 認証 React hooks — AuthSnapshot context を hana-memo のドメイン形に正規化する。
 *
 * - `useClerkUserId`: Vercel Function 認証 (JWT subject) で使う Clerk user id を同期取得
 * - `useCurrentUser`: 認証状態を {clerkUserId, email, isAnonymous, isLoaded, isSignedIn} に整形
 *
 * Clerk への直接依存は `./context.tsx` の ClerkAuthBridge に隔離済 (keyless でも throw しない)。
 * Neon users との合体 (trial_used_count 等) が要るコンポーネントは別途 `/api/...` を叩く。
 * 関連: src/shared/auth/context.tsx, docs/_shared/auth/001_auth_SPEC.md §1.1, 002_auth_PLAN.md Phase 5
 */
import { useAuthSnapshot } from './auth-context';

export type CurrentUser = {
  isLoaded: boolean;
  isSignedIn: boolean;
  clerkUserId: string | null;
  email: string | null;
  /** email / external account が無い = 匿名 (Guest) とみなす。 */
  isAnonymous: boolean;
};

/** Clerk user id を取得する (未 sign-in / keyless は null)。 */
export function useClerkUserId(): string | null {
  return useAuthSnapshot().userId;
}

/** 認証スナップショットをドメイン形に正規化して返す (keyless でも throw しない)。 */
export function useCurrentUser(): CurrentUser {
  const { isLoaded, isSignedIn, userId, email, hasExternalAccount } = useAuthSnapshot();
  return {
    isLoaded,
    isSignedIn,
    clerkUserId: userId,
    email,
    isAnonymous: Boolean(userId) && !email && !hasExternalAccount,
  };
}

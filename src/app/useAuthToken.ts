/**
 * app 層 認証トークン hook — Clerk の `useAuth().getToken()` (async) を React state に解決し、
 * 各 feature データ hook が要求する同期 `token: string` を供給する。
 *
 * feature hooks (useNotebook / useMemories / useBillingStatus / useExport / storage useSignedUrl 等) は
 * `token: string` を同期で受け取る前提のため、本 hook が Clerk の非同期トークン取得を吸収して
 * 「取得済みなら token 文字列 / 未取得・未 sign-in なら null」を返す。container は token=null の間は
 * データ取得をスキップ (seam) し、token 確定後に hook を起動する。
 *
 * Clerk の guest session UX (signInAsGuest β) は実 Clerk セッションを要するため本 hook では扱わず、
 * sign-in 済前提で token を取得する。未 sign-in (guest 未確立) の間は token=null。
 *
 * 関連: docs/_shared/auth/001_auth_SPEC.md §1.1, src/shared/auth/hooks.ts (useCurrentUser/useClerkUserId)
 */
import { useEffect, useState } from 'react';
import { useAuth } from '@clerk/clerk-react';

export type AuthTokenState = {
  /** 取得済みトークン。未取得 / 未 sign-in の間は null。 */
  token: string | null;
  /** Clerk のロード完了フラグ。 */
  isLoaded: boolean;
  /** sign-in 済か。 */
  isSignedIn: boolean;
};

/**
 * Clerk セッショントークンを state に解決して返す。
 * isLoaded && isSignedIn のとき getToken() を呼び、解決値を token に格納する。
 */
export function useAuthToken(): AuthTokenState {
  const { getToken, isLoaded, isSignedIn } = useAuth();
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    if (!isLoaded || !isSignedIn) {
      setToken(null);
      return;
    }
    void (async () => {
      try {
        const t = await getToken();
        if (active) {
          setToken(t ?? null);
        }
      } catch {
        if (active) {
          setToken(null);
        }
      }
    })();
    return () => {
      active = false;
    };
  }, [getToken, isLoaded, isSignedIn]);

  return { token, isLoaded, isSignedIn: Boolean(isSignedIn) };
}

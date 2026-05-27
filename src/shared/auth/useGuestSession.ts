/**
 * 起動時の匿名サインインを駆動する React hook (revise_001)。
 *
 * Clerk の `useSignIn` (ticket sign-in) と AuthSnapshot (isLoaded/isSignedIn) を結線し、
 * 未 sign-in なら `ensureGuestSession` (single-flight + retry) 経由で 1 度だけ匿名 session を
 * 確立する。**ClerkProvider 内 (= キーあり時) でのみ使う**こと (useSignIn が必要)。
 *
 * 純ロジック (ticket 取得 / signIn.create / setActive) は `./guest-client.ts` に隔離済。
 * 本 hook は Clerk hook の配線 + boot effect + status state のみを担う。
 *
 * 関連: ./guest-session.ts (ensureGuestSession), ./guest-client.ts, src/shared/auth/GuestSessionGate.tsx
 */
import { useEffect, useRef, useState } from 'react';
import { useSignIn } from '@clerk/clerk-react';
import { useAuthSnapshot } from './auth-context';
import { ensureGuestSession } from './guest-session';
import { buildGuestSignIn, fetchGuestTicket } from './guest-client';

export type GuestSessionStatus = 'idle' | 'signing-in' | 'active' | 'error';

export type UseGuestSessionOptions = {
  /** デバイス fingerprint を返す (spam-guard 用、任意)。失敗は空文字で握り潰す。 */
  getFingerprint?: () => Promise<string>;
  /** テスト用 fetch 注入 (既定はグローバル fetch)。 */
  fetchFn?: typeof fetch;
};

/**
 * 起動時に匿名 session を保証する。
 * @returns `{ status }` — fatal モーダル制御等に使える (GuestSessionGate)。
 */
export function useGuestSession(opts: UseGuestSessionOptions = {}): { status: GuestSessionStatus } {
  const { isLoaded, isSignedIn } = useAuthSnapshot();
  const { isLoaded: signInLoaded, signIn, setActive } = useSignIn();
  const [status, setStatus] = useState<GuestSessionStatus>('idle');
  const started = useRef(false);
  // opts は呼び出しごとに新オブジェクトになり得るため ref で安定化 (effect deps に入れない)。
  const optsRef = useRef(opts);
  optsRef.current = opts;

  useEffect(() => {
    if (!isLoaded || !signInLoaded || !signIn || !setActive) return;
    if (isSignedIn) {
      setStatus('active');
      return;
    }
    if (started.current) return;
    started.current = true; // 一度きり (失敗は terminal、ensureGuestSession 内で 1 回 retry 済)
    setStatus('signing-in');

    const o = optsRef.current;
    const signInAsGuest = buildGuestSignIn({
      fetchTicket: async () => {
        const fp = o.getFingerprint ? await o.getFingerprint().catch(() => '') : '';
        return fetchGuestTicket(o.fetchFn ?? fetch, { fingerprint: fp });
      },
      signInCreate: (params) =>
        signIn.create(params) as unknown as Promise<{ createdSessionId: string | null }>,
      setActive: (params) => setActive(params),
    });

    void ensureGuestSession({ isSignedIn, signInAsGuest })
      .then(() => setStatus('active'))
      .catch(() => setStatus('error'));
  }, [isLoaded, signInLoaded, signIn, setActive, isSignedIn]);

  return { status };
}

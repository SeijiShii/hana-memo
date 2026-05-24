/**
 * Guest sign-in 保証ロジック (Clerk Guest Users β、起動時)
 *
 * `ensureGuestSession` は SDK 非依存の純オーケストレーション:
 *   - 既に sign-in 済なら no-op
 *   - 未 sign-in なら signInAsGuest を呼ぶ。失敗時 1 回 retry、最終失敗で AuthInitError (E-AU-001)
 *   - 同時並列呼出は単一の in-flight Promise を共有する (二重 sign-in 防止、UT-AU-E01 lock)
 *
 * React 側の `useGuestSession` は Clerk SDK の guest sign-in を `signInAsGuest` として注入する
 * thin アダプタ (Clerk β API 依存のため E2E/手動検証は Milestone C)。
 *
 * 関連: docs/_shared/auth/001_auth_SPEC.md §1.1 / §4.2 (E-AU-001), 003_auth_UNIT_TEST.md §1.1, §1.5
 */
import { AuthInitError } from './errors';

export type GuestSignInFn = () => Promise<void>;

/** initSession の初回 + retry 合計試行回数 (UT-AU-S03: 失敗時 retry 1 回)。 */
const MAX_ATTEMPTS = 2;

/** プロセス内で進行中の guest sign-in (single-flight lock)。 */
let inflight: Promise<void> | null = null;

async function attemptWithRetry(fn: GuestSignInFn, maxAttempts: number): Promise<void> {
  let lastErr: unknown;
  for (let i = 0; i < maxAttempts; i += 1) {
    try {
      await fn();
      return;
    } catch (err) {
      lastErr = err;
    }
  }
  throw lastErr;
}

/**
 * 起動時に guest session を保証する。
 * @param opts.isSignedIn 既存 session の有無 (Clerk の isSignedIn)
 * @param opts.signInAsGuest 匿名 sign-in を行う注入関数
 */
export async function ensureGuestSession(opts: {
  isSignedIn: boolean;
  signInAsGuest: GuestSignInFn;
}): Promise<void> {
  if (opts.isSignedIn) return;
  if (inflight) return inflight;

  inflight = (async () => {
    try {
      await attemptWithRetry(opts.signInAsGuest, MAX_ATTEMPTS);
    } catch (err) {
      throw new AuthInitError('Failed to initialize guest session', err);
    }
  })();

  try {
    await inflight;
  } finally {
    inflight = null;
  }
}

/** テスト用: in-flight lock をリセットする。 */
export function __resetGuestSessionLock(): void {
  inflight = null;
}

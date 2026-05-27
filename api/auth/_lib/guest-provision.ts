/**
 * 匿名(ゲスト)ユーザー発行の純オーケストレーション (revise_001)。
 *
 * Clerk に「Guest Users β / signInAsGuest」は実在しないため、backend で匿名 Clerk user を
 * 作成し sign-in ticket を発行する方式を採る:
 *   1. レート制限 (匿名 user 量産 = Clerk MAU 濫用の防止 [SEC-001])
 *   2. (任意) fingerprint hard cap
 *   3. createUser (externalId + publicMetadata.isAnonymous) → Neon users upsert
 *   4. createSignInToken でフロント向け ticket を発行
 *
 * Clerk SDK / DB / limiter はすべて注入のため SDK 非依存で単体テスト可能 (perspectives O35)。
 * 実 SDK 配線は `api/auth/guest.ts` handler が dynamic import で隔離する。
 *
 * 関連: docs/_shared/auth/revise_001_20260525_clerk-ticket-guest-auth/001_REVISE_SPEC.md §7,
 *       003_REVISE_UNIT_TEST.md §1 (UT-AU-GP01〜05)
 */

/** レート超過 / fingerprint cap (429 にマップ)。 */
export class GuestRateLimitedError extends Error {
  readonly status = 429;
  constructor(public readonly reason: 'rate_limited' | 'must_link' = 'rate_limited') {
    super(reason);
    this.name = 'GuestRateLimitedError';
  }
}

/** Clerk createUser / token 発行失敗 (503 にマップ)。 */
export class GuestProvisionError extends Error {
  readonly status = 503;
  constructor(message = 'guest_provision_failed', options?: { cause?: unknown }) {
    super(message, options);
    this.name = 'GuestProvisionError';
  }
}

/** 同一 fingerprint で許容する匿名アカウント上限 (spam-check と共有概念)。 */
export const GUEST_FINGERPRINT_HARD_CAP = 100;

/** ticket の既定有効秒。 */
export const GUEST_TICKET_TTL_SEC = 600;

export type ProvisionGuestDeps = {
  /** Upstash 等のレート判定。success=false で 429。 */
  checkRateLimit: (key: string) => Promise<{ success: boolean }>;
  /** Clerk 匿名 user 作成。externalId / metadata を受け id を返す。 */
  createUser: (input: {
    externalId: string;
    publicMetadata: Record<string, unknown>;
  }) => Promise<{ id: string }>;
  /** Neon users に匿名行を upsert。 */
  upsertUser: (input: { clerkUserId: string; fingerprintHash: string | null }) => Promise<void>;
  /** Clerk sign-in token (ticket) 発行。 */
  createSignInToken: (input: {
    userId: string;
    expiresInSeconds: number;
  }) => Promise<{ token: string }>;
  /** 匿名 user の externalId 生成 (uuid 等)。 */
  genExternalId: () => string;
  /** fingerprint に紐づく既存匿名 user 数 (cap 判定、未導入なら省略=cap 無効)。 */
  countByFingerprint?: (fingerprintHash: string) => Promise<number>;
  /** hard cap (テスト上書き用)。 */
  fingerprintHardCap?: number;
  /** ticket 有効秒 (既定 GUEST_TICKET_TTL_SEC)。 */
  ticketTtlSec?: number;
};

/**
 * 匿名 session 用の sign-in ticket を発行する。
 * @returns `{ ticket }` フロントが `signIn.create({strategy:'ticket', ticket})` に渡す。
 * @throws GuestRateLimitedError (429) / GuestProvisionError (503)
 */
export async function provisionGuest(
  input: { rateKey: string; fingerprintHash?: string | null },
  deps: ProvisionGuestDeps,
): Promise<{ ticket: string }> {
  const { success } = await deps.checkRateLimit(input.rateKey);
  if (!success) throw new GuestRateLimitedError('rate_limited');

  const fp = input.fingerprintHash ?? null;
  if (fp && deps.countByFingerprint) {
    const cap = deps.fingerprintHardCap ?? GUEST_FINGERPRINT_HARD_CAP;
    const count = await deps.countByFingerprint(fp);
    if (count >= cap) throw new GuestRateLimitedError('must_link');
  }

  let userId: string;
  try {
    const externalId = deps.genExternalId();
    const user = await deps.createUser({
      externalId,
      publicMetadata: { isAnonymous: true },
    });
    userId = user.id;
    await deps.upsertUser({ clerkUserId: userId, fingerprintHash: fp });
  } catch (err) {
    throw new GuestProvisionError('guest_provision_failed', { cause: err });
  }

  try {
    const { token } = await deps.createSignInToken({
      userId,
      expiresInSeconds: deps.ticketTtlSec ?? GUEST_TICKET_TTL_SEC,
    });
    return { ticket: token };
  } catch (err) {
    throw new GuestProvisionError('guest_provision_failed', { cause: err });
  }
}

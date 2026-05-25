/**
 * 匿名(ゲスト)サインイン ticket 発行エンドポイント (revise_001)。
 *
 * 未認証で叩ける入口 (session を作る側のため)。濫用対策はレート制限 + fingerprint cap。
 * Clerk backend で匿名 user を作成 → Neon users upsert → sign-in token (ticket) を返す。
 * フロントは ticket を `signIn.create({strategy:'ticket', ticket})` に渡して session 確立する。
 *
 * オーケストレーション本体は `./_lib/guest-provision.ts` (純関数、単体テスト済)。本 handler は
 * Clerk SDK / DB / Upstash を dynamic import で隔離する (perspectives O35)。
 *
 * 関連: docs/_shared/auth/revise_001_20260525_clerk-ticket-guest-auth/{001_REVISE_SPEC §7.2, 002_REVISE_PLAN}
 */
import {
  provisionGuest,
  GuestRateLimitedError,
} from './_lib/guest-provision';

export const config = { runtime: 'nodejs' };

function jsonResponse(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

/** レート制限キーを作る (fingerprint 優先、無ければ IP、最後に 'anon')。純関数。 */
export function guestRateKey(input: { fingerprint?: string; ip?: string | null }): string {
  const id = (input.fingerprint && input.fingerprint.trim()) || input.ip || 'anon';
  return `guest:${id}`;
}

/** x-forwarded-for から最初の IP を取り出す (純関数)。 */
export function clientIpFrom(headerValue: string | null): string | null {
  if (!headerValue) return null;
  const first = headerValue.split(',')[0]?.trim();
  return first || null;
}

async function handler(req: Request): Promise<Response> {
  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 });
  }

  const body = (await req.json().catch(() => ({}))) as { fingerprint?: string };
  const fingerprint = typeof body.fingerprint === 'string' ? body.fingerprint : '';
  const ip = clientIpFrom(req.headers.get('x-forwarded-for'));

  const secretKey = process.env.CLERK_SECRET_KEY;
  if (!secretKey) return jsonResponse({ error: 'guest_provision_failed' }, 503);

  const [clerk, dbMod, schemaMod, rl, nodeCrypto] = await Promise.all([
    import('@clerk/backend'),
    import('../../src/shared/db/client'),
    import('../../src/shared/db/schema'),
    import('../_lib/ratelimit'),
    import('node:crypto'),
  ]);

  const clerkClient = clerk.createClerkClient({ secretKey });
  const limiter = rl.createGuestRateLimiter();
  const { db } = dbMod;
  const { users } = schemaMod;

  try {
    const { ticket } = await provisionGuest(
      { rateKey: guestRateKey({ fingerprint, ip }), fingerprintHash: fingerprint || null },
      {
        checkRateLimit: async (key) => {
          const r = await limiter.limit(key);
          return { success: r.success };
        },
        createUser: async ({ externalId, publicMetadata }) => {
          // [論点-002] Clerk は identifier 必須。externalId(UUID) を付与 (email/username を消費しない)。
          const u = await clerkClient.users.createUser({ externalId, publicMetadata });
          return { id: u.id };
        },
        upsertUser: async ({ clerkUserId, fingerprintHash }) => {
          await db
            .insert(users)
            .values({ clerkUserId, isAnonymous: true, fingerprintHash })
            .onConflictDoUpdate({
              target: users.clerkUserId,
              set: { isAnonymous: true },
            });
        },
        createSignInToken: async ({ userId, expiresInSeconds }) => {
          const t = await clerkClient.signInTokens.createSignInToken({ userId, expiresInSeconds });
          return { token: t.token };
        },
        genExternalId: () => nodeCrypto.randomUUID(),
      },
    );
    return jsonResponse({ ticket }, 200);
  } catch (err) {
    if (err instanceof GuestRateLimitedError) {
      return jsonResponse({ error: err.reason }, 429);
    }
    return jsonResponse({ error: 'guest_provision_failed' }, 503);
  }
}

export default { fetch: handler };

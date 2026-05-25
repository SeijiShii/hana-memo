/**
 * Clerk Webhook 受信エンドポイント (user.created / updated / deleted → Neon users 同期)
 *
 * svix で署名検証 → `mapClerkWebhookEvent` (純関数) で同期操作を導出 → `applyUserSync` で
 * Drizzle store に適用する。べき等性は users.clerk_user_id UNIQUE 制約 + onConflictDoUpdate で確保
 * ([SEC-006] / E-AU-006)。db クライアントは env 依存のため handler 内で遅延 import する。
 *
 * 関連: docs/_shared/auth/001_auth_SPEC.md §1.2 / §4.2 (E-AU-006), 002_auth_PLAN.md Phase 2
 */
import { Webhook } from 'svix';
import {
  applyUserSync,
  mapClerkWebhookEvent,
  type ClerkWebhookEvent,
  type UserSyncStore,
} from '../src/shared/auth/webhook';

/** svix ヘッダ三点 (テスト注入可能なよう型を切り出す)。 */
export type SvixHeaders = {
  'svix-id': string;
  'svix-timestamp': string;
  'svix-signature': string;
};

export type VerifyWebhookFn = (rawBody: string, headers: SvixHeaders) => ClerkWebhookEvent;

/** webhook 処理結果 (HTTP ステータスへマップ)。 */
export type WebhookResult = { status: number; body: { ok: boolean; reason?: string } };

/**
 * Webhook の検証 → mapping → 適用を行う (テスト可能、db/svix は注入)。
 */
export async function processClerkWebhook(
  rawBody: string,
  headers: SvixHeaders,
  deps: { verify: VerifyWebhookFn; store: UserSyncStore; now?: Date },
): Promise<WebhookResult> {
  let event: ClerkWebhookEvent;
  try {
    event = deps.verify(rawBody, headers);
  } catch {
    return { status: 401, body: { ok: false, reason: 'invalid signature' } };
  }
  const op = mapClerkWebhookEvent(event);
  await applyUserSync(op, deps.store, deps.now);
  return { status: 200, body: { ok: true } };
}

function readSvixHeaders(req: Request): SvixHeaders {
  return {
    'svix-id': req.headers.get('svix-id') ?? '',
    'svix-timestamp': req.headers.get('svix-timestamp') ?? '',
    'svix-signature': req.headers.get('svix-signature') ?? '',
  };
}

/** drizzle 実体で UserSyncStore を構築する (env 依存の db を遅延 import)。 */
async function createDrizzleStore(): Promise<UserSyncStore> {
  const [{ db }, { users }, { eq }] = await Promise.all([
    import('../src/shared/db/client'),
    import('../src/shared/db/schema'),
    import('drizzle-orm'),
  ]);
  return {
    async upsertUser(clerkUserId, values) {
      await db
        .insert(users)
        .values({
          clerkUserId,
          email: values.email,
          isAnonymous: values.isAnonymous,
          linkedAt: values.linkedAt,
        })
        .onConflictDoUpdate({
          target: users.clerkUserId,
          set: {
            email: values.email,
            isAnonymous: values.isAnonymous,
            linkedAt: values.linkedAt,
          },
        });
    },
    async softDeleteUser(clerkUserId) {
      await db
        .update(users)
        .set({ deletedAt: new Date() })
        .where(eq(users.clerkUserId, clerkUserId));
    },
  };
}

export const config = { runtime: 'nodejs' };

/** Vercel Web handler。 */
async function handler(req: Request): Promise<Response> {
  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 });
  }
  const secret = process.env.CLERK_WEBHOOK_SIGNING_SECRET;
  if (!secret) {
    return new Response('server misconfigured', { status: 500 });
  }
  const rawBody = await req.text();
  const headers = readSvixHeaders(req);
  const verify: VerifyWebhookFn = (body, h) =>
    new Webhook(secret).verify(body, h) as ClerkWebhookEvent;

  const store = await createDrizzleStore();
  const result = await processClerkWebhook(rawBody, headers, { verify, store });
  return new Response(JSON.stringify(result.body), {
    status: result.status,
    headers: { 'content-type': 'application/json' },
  });
}

export default { fetch: handler };

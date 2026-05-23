/**
 * Clerk Webhook → Neon users 同期ロジック ([SEC-006] idempotency-adjacent)
 *
 * - `mapClerkWebhookEvent`: Clerk イベントを DB 操作記述子に変換する純関数 (svix 署名検証は呼び出し側)
 * - `applyUserSync`: 記述子を UserSyncStore (DI) に適用。実 drizzle upsert (onConflictDoUpdate) は
 *   api/clerk-webhook.ts で store を実装して注入する。
 *
 * 関連: docs/_shared/auth/001_auth_SPEC.md §1.2 / §4.2 (E-AU-006), 002_auth_PLAN.md Phase 2
 */

/** Clerk webhook イベント (svix 検証後の payload の必要部分) */
export type ClerkWebhookEvent = {
  type: string; // 'user.created' | 'user.updated' | 'user.deleted'
  data: {
    id: string;
    email_addresses?: { email_address: string }[];
    external_accounts?: unknown[];
  };
};

export type UserSyncOp =
  | {
      op: 'upsert';
      clerkUserId: string;
      email: string | null;
      isAnonymous: boolean;
    }
  | { op: 'softDelete'; clerkUserId: string }
  | { op: 'ignore'; reason: string };

/** Clerk イベントを users 同期操作に変換する (純関数)。 */
export function mapClerkWebhookEvent(event: ClerkWebhookEvent): UserSyncOp {
  const clerkUserId = event.data?.id;
  if (!clerkUserId) {
    return { op: 'ignore', reason: 'missing data.id' };
  }
  switch (event.type) {
    case 'user.created':
    case 'user.updated': {
      const email = event.data.email_addresses?.[0]?.email_address ?? null;
      const hasIdentity =
        (event.data.email_addresses?.length ?? 0) > 0 ||
        (event.data.external_accounts?.length ?? 0) > 0;
      return {
        op: 'upsert',
        clerkUserId,
        email,
        isAnonymous: !hasIdentity,
      };
    }
    case 'user.deleted':
      return { op: 'softDelete', clerkUserId };
    default:
      return { op: 'ignore', reason: `unhandled event type: ${event.type}` };
  }
}

/** users への idempotent な書き込みを抽象化 (実体は drizzle upsert を api/ 層で注入)。 */
export type UserSyncStore = {
  upsertUser(
    clerkUserId: string,
    values: { email: string | null; isAnonymous: boolean; linkedAt: Date | null },
  ): Promise<void>;
  softDeleteUser(clerkUserId: string): Promise<void>;
};

/**
 * 同期操作を store に適用する。
 * - upsert: linkedAt は OAuth リンク済 (isAnonymous=false) のときだけ now をセット
 * - softDelete: deletedAt をセット (store 実装側)
 * - ignore: 何もしない
 */
export async function applyUserSync(
  op: UserSyncOp,
  store: UserSyncStore,
  now: Date = new Date(),
): Promise<void> {
  if (op.op === 'upsert') {
    await store.upsertUser(op.clerkUserId, {
      email: op.email,
      isAnonymous: op.isAnonymous,
      linkedAt: op.isAnonymous ? null : now,
    });
  } else if (op.op === 'softDelete') {
    await store.softDeleteUser(op.clerkUserId);
  }
  // op.op === 'ignore' → no-op
}

/**
 * Clerk user id → Neon users.id 解決 (storage Vercel Function 共通)
 *
 * objectKey の先頭 segment は Neon users.id (UUID) のため、Clerk JWT subject から解決する。
 * DB アクセスは dynamic import で行い、判定可能部分を deps 注入できるようにして unit test を
 * DB 非依存に保つ。
 *
 * 関連: docs/_shared/storage/001_storage_SPEC.md §3.2/§3.3, ../_lib/clerk.ts
 */

/** Neon に対応 user が無い (404 にマップ)。 */
export class UserNotFoundError extends Error {
  readonly status = 404;
  constructor(message = 'User not found') {
    super(message);
    this.name = 'UserNotFoundError';
  }
}

export type ResolveUserDeps = {
  /** clerkUserId → Neon users.id (見つからなければ null)。既定は Neon を引く。 */
  query?: (clerkUserId: string) => Promise<string | null>;
};

async function defaultQuery(clerkUserId: string): Promise<string | null> {
  const [{ db }, { users }, { eq }] = await Promise.all([
    import('../../../src/shared/db/client'),
    import('../../../src/shared/db/schema'),
    import('drizzle-orm'),
  ]);
  const rows = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.clerkUserId, clerkUserId))
    .limit(1);
  return rows[0]?.id ?? null;
}

/** Clerk user id から Neon users.id を解決する。未登録は UserNotFoundError。 */
export async function resolveUserId(clerkUserId: string, deps: ResolveUserDeps = {}): Promise<string> {
  const query = deps.query ?? defaultQuery;
  const id = await query(clerkUserId);
  if (!id) {
    throw new UserNotFoundError();
  }
  return id;
}

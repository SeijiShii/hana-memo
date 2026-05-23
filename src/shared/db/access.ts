/**
 * アクセス制御ヘルパ ([SEC-005] 認可ネガティブテスト対応)
 *
 * - `withUserScope`: userId を scope に閉じ込めて Drizzle クエリを実行する高階関数
 * - `assertOwner`: フェッチ後の所有者検証 (防御線)
 *
 * 関連: docs/_shared/db/001_db_SPEC.md §1.3
 *      docs/SECURITY_REVIEW_20260523.md [SEC-005]
 */

export class AuthorizationError extends Error {
  constructor(
    public readonly expectedUserId: string,
    public readonly actualUserId: string,
  ) {
    super(
      `Authorization failed: expected userId=${expectedUserId}, got userId=${actualUserId}`,
    );
    this.name = 'AuthorizationError';
  }
}

export type UserScope = {
  userId: string;
};

/**
 * userId を scope に閉じ込めて非同期処理を実行する。
 * scope.userId は Drizzle クエリの `where eq(table.user_id, scope.userId)` に渡す前提。
 *
 * @example
 *   const discoveries = await withUserScope(ctx.userId, async (scope) => {
 *     return db.select().from(discoveries).where(eq(discoveries.userId, scope.userId));
 *   });
 */
export async function withUserScope<T>(
  userId: string,
  fn: (scope: UserScope) => Promise<T>,
): Promise<T> {
  if (!userId || typeof userId !== 'string') {
    throw new TypeError('withUserScope requires a non-empty string userId');
  }
  return fn({ userId });
}

/**
 * フェッチ後の所有者検証。Drizzle で取得した row が想定 user の所有か確認する。
 * 防御線として使用 (Drizzle where 句が漏れたケースを検出)。
 *
 * @throws {AuthorizationError} row.user_id !== userId の場合
 */
export function assertOwner(
  row: { userId: string } | { user_id: string },
  userId: string,
): void {
  const rowUserId = 'userId' in row ? row.userId : row.user_id;
  if (rowUserId !== userId) {
    throw new AuthorizationError(userId, rowUserId);
  }
}

/**
 * 認可ガード ([SEC-005] 認可漏れ防御)
 *
 * Vercel Function で current user (verifyClerkSession 由来) と target user を突き合わせる
 * アプリ層チェック。DB 層の `_shared/db/access.ts` assertOwner (fetch 後検証) と二段で防御する。
 *
 * 関連: docs/_shared/auth/003_auth_UNIT_TEST.md §1.4 (UT-AU-R01〜R02)
 */

/** current user が target user 本人でなければ throw する (RLS 相当のアプリ層検証)。 */
export function assertOwnUser(currentUserId: string, targetUserId: string): void {
  if (!currentUserId || !targetUserId) {
    throw new Error('RLS violation: missing user id');
  }
  if (currentUserId !== targetUserId) {
    throw new Error(
      `RLS violation: user ${currentUserId} cannot access ${targetUserId}`,
    );
  }
}

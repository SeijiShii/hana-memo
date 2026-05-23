/**
 * アカウント削除ドメインロジック (二段階確認 + grace period)
 * 関連: docs/account/001_account_SPEC.md UC5, 003_account_UNIT_TEST.md §1.2/§1.9 (A/PG)
 */
import { AlreadyDeletedError, NotPendingDeletionError } from './errors';

/** grace period 30 日 (経過後に purge cron が完全削除) */
export const DELETION_GRACE_DAYS = 30;
/** 削除理由の最大長 */
export const MAX_DELETION_REASON = 500;

/** 削除理由を整形 (trim + 500 文字 cap、空は null、UT-AC-A02/D03)。 */
export function sanitizeDeletionReason(reason: string | null | undefined): string | null {
  if (!reason) return null;
  const trimmed = reason.trim();
  if (trimmed === '') return null;
  return trimmed.slice(0, MAX_DELETION_REASON);
}

/** deleted_at から purge 適格か判定 (grace 経過 = gte 30日、UT-AC-PG01〜PG03/B01)。 */
export function isPurgeEligible(
  deletedAt: Date | null,
  now: Date = new Date(),
  graceDays = DELETION_GRACE_DAYS,
): boolean {
  if (!deletedAt) return false;
  const elapsedMs = now.getTime() - deletedAt.getTime();
  return elapsedMs >= graceDays * 24 * 60 * 60 * 1000;
}

/** users.deleted_at の読み書きを抽象化 (実体は Drizzle/RPC を api/ 層で注入)。 */
export type AccountDeletionStore = {
  getDeletedAt(userId: string): Promise<Date | null>;
  setDeletedAt(userId: string, at: Date | null, reason: string | null): Promise<void>;
};

/** 削除予約 (二段階確認後)。既に予約済みなら AlreadyDeletedError (UT-AC-A01/A03)。 */
export async function requestAccountDeletion(
  store: AccountDeletionStore,
  userId: string,
  reason: string | null | undefined,
  now: Date = new Date(),
): Promise<void> {
  const current = await store.getDeletedAt(userId);
  if (current) throw new AlreadyDeletedError();
  await store.setDeletedAt(userId, now, sanitizeDeletionReason(reason));
}

/** 削除予約の取消 (grace 期間中)。未予約なら NotPendingDeletionError (UT-AC-A04/A05)。 */
export async function cancelAccountDeletion(
  store: AccountDeletionStore,
  userId: string,
): Promise<void> {
  const current = await store.getDeletedAt(userId);
  if (!current) throw new NotPendingDeletionError();
  await store.setDeletedAt(userId, null, null);
}

/**
 * アカウント削除確認ダイアログ (UC5 — 二段階確認 + grace period の UI seam)。
 *
 * 不可逆操作 (30 日 grace 後に完全削除) のため、ワンクリックでは削除させない。SPEC UC5 の二段階確認を
 * 1 ダイアログ内の 2 ステップで表現する:
 *   step1 (warn): 削除予定の件数 (discoveries N 件 / 画像 M 枚) と「30 日後に完全削除されます」を表示し
 *                 「削除を予約」で step2 へ進む。
 *   step2 (confirm): 削除理由 textarea (任意、MAX_DELETION_REASON で UI 側 cap) + 明示同意チェック +
 *                    「確認しました、削除します」を押して初めて onDeleteAccount(reason) を起動する。
 *
 * 実削除は一切行わない seam: onDeleteAccount は呼び出し側 (アプリ層) が requestAccountDeletion +
 * Drizzle/RPC + signOut を配線する。本ダイアログは reason を sanitizeDeletionReason で整形して渡すだけ。
 *
 * 関連: docs/account/001_account_SPEC.md §1 UC5 / §4.2 (E-AC-005),
 *       docs/account/002_account_PLAN.md §1.1 (DeleteAccountModal),
 *       docs/account/004_account_E2E_TEST.md (E-AC-5)
 */
import { useState } from 'react';
import { cn } from '../../../lib/utils';
import { MAX_DELETION_REASON, sanitizeDeletionReason } from '../deletion';

export type DeleteAccountDialogProps = {
  /** true で表示する。false のとき何も描画しない。 */
  open: boolean;
  /** 削除予定の発見 (discoveries) 件数。step1 の確認に表示する。既定 0。 */
  discoveryCount?: number;
  /** 削除予定の画像枚数。step1 の確認に表示する。既定 0。 */
  imageCount?: number;
  /**
   * 削除確定時 (二段階確認 + 明示同意の後)。整形済みの理由 (null 可) を渡す。
   * 実削除 (requestAccountDeletion + signOut) はアプリ層が配線する seam。本ダイアログは実削除しない。
   */
  onDeleteAccount: (reason: string | null) => Promise<void> | void;
  /** キャンセル / 背景クリックで閉じる。 */
  onClose?: () => void;
  /** 削除処理中フラグ (アプリ層由来)。既定 false。 */
  pending?: boolean;
  /** 削除失敗 (E-AC-005、アプリ層 RPC 失敗由来)。 */
  error?: Error | null;
};

/** 二段階確認のステップ。 */
type Step = 'warn' | 'confirm';

/** アカウント削除確認ダイアログ。明示同意を経ないと onDeleteAccount を起動しない。 */
export function DeleteAccountDialog({
  open,
  discoveryCount = 0,
  imageCount = 0,
  onDeleteAccount,
  onClose,
  pending = false,
  error = null,
}: DeleteAccountDialogProps) {
  const [step, setStep] = useState<Step>('warn');
  const [reason, setReason] = useState('');
  // 不可逆操作の明示同意 (チェックなしでは削除確定不可)。
  const [acknowledged, setAcknowledged] = useState(false);
  const [localError, setLocalError] = useState<Error | null>(null);

  if (!open) {
    return null;
  }

  const handleClose = () => {
    // 閉じるたびにステップ / 入力を初期化し、次回はまた step1 + 未同意から始める。
    setStep('warn');
    setReason('');
    setAcknowledged(false);
    setLocalError(null);
    onClose?.();
  };

  const handleConfirm = async () => {
    // 明示同意なし / 処理中は確定させない (ワンクリック削除の防止)。
    if (!acknowledged || pending) {
      return;
    }
    setLocalError(null);
    try {
      await onDeleteAccount(sanitizeDeletionReason(reason));
    } catch (err) {
      setLocalError(err instanceof Error ? err : new Error(String(err)));
    }
  };

  const shownError = error ?? localError;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="アカウント削除"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
    >
      <div className="flex max-h-[90dvh] w-full max-w-sm flex-col overflow-y-auto rounded-2xl bg-white p-6 shadow-xl">
        {step === 'warn' ? (
          <>
            <h2 className="text-lg font-bold text-red-600">アカウントを削除しますか？</h2>
            <p className="mt-2 text-sm text-neutral-600">
              発見 {discoveryCount} 件、画像 {imageCount} 枚が 30 日後に完全に削除されます。
              それまでは取消して復元できます。
            </p>
            <p className="mt-2 text-sm font-semibold text-red-600">
              この操作は 30 日経過後は取り消せません。
            </p>
            <div className="mt-5 flex flex-col gap-2">
              <button
                type="button"
                onClick={() => setStep('confirm')}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700"
              >
                削除を予約
              </button>
              <button
                type="button"
                onClick={handleClose}
                className="rounded-lg px-4 py-2 text-sm text-neutral-500 hover:bg-neutral-100"
              >
                キャンセル
              </button>
            </div>
          </>
        ) : (
          <>
            <h2 className="text-lg font-bold text-red-600">本当に削除しますか？</h2>
            <p className="mt-2 text-sm text-neutral-600">
              よろしければ理由をお聞かせください（任意）。確認のうえ削除を予約します。
            </p>

            <label className="mt-4 flex flex-col gap-1 text-sm text-neutral-600">
              削除理由（任意）
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                maxLength={MAX_DELETION_REASON}
                rows={3}
                aria-label="削除理由"
                className="rounded-lg border border-neutral-200 px-3 py-2 text-base text-neutral-800 focus:border-green-600 focus:outline-none"
              />
            </label>

            <label className="mt-4 flex items-start gap-2 text-sm text-neutral-700">
              <input
                type="checkbox"
                checked={acknowledged}
                onChange={(e) => setAcknowledged(e.target.checked)}
                aria-label="削除に同意する"
                className="mt-0.5 h-4 w-4 accent-red-600"
              />
              <span>30 日経過後にすべてのデータが完全に削除されることを理解しました。</span>
            </label>

            {shownError ? (
              <p role="alert" className="mt-3 text-sm text-red-500">
                削除の予約に失敗しました。時間をおいて再度お試しください。
              </p>
            ) : null}

            {!acknowledged ? (
              <p className="mt-3 text-xs text-neutral-400">削除するには上記の同意が必要です</p>
            ) : null}

            <div className="mt-5 flex flex-col gap-2">
              <button
                type="button"
                onClick={handleConfirm}
                disabled={!acknowledged || pending}
                aria-busy={pending}
                className={cn(
                  'rounded-lg px-4 py-2 text-sm font-semibold text-white',
                  'bg-red-600 hover:bg-red-700 disabled:opacity-50',
                )}
              >
                {pending ? '処理中…' : '確認しました、削除します'}
              </button>
              <button
                type="button"
                onClick={handleClose}
                disabled={pending}
                className="rounded-lg px-4 py-2 text-sm text-neutral-500 hover:bg-neutral-100 disabled:opacity-50"
              >
                キャンセル
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

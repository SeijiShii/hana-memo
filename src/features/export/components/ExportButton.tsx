/**
 * エクスポート起動ボタン — notebook / 設定から ExportDialog を開くトリガー (UC1/UC2/UC4)。
 *
 * 押下で onClick を起動する (アプリ層でダイアログの open 状態を制御する想定)。
 * 削除予約 user (deleted_at set) は export 不可のため disabled にする (SPEC §6.1 / PLAN §6 DeletionPendingGate)。
 *
 * 関連: docs/export/001_export_SPEC.md §1 UC1/UC2/UC4 §6.1, docs/export/002_export_PLAN.md §1/§6
 */
import { cn } from '../../../lib/utils';

export type ExportButtonProps = {
  /** 押下時 (ExportDialog の open を制御するアプリ層へ委譲)。 */
  onClick: () => void;
  /** 削除予約中など export 不可のとき true (SPEC §6.1)。既定 false。 */
  disabled?: boolean;
  /** ボタン文言。既定「書き出す」。 */
  label?: string;
};

/** ExportDialog を開くトリガーボタン。削除予約 user は disabled。 */
export function ExportButton({ onClick, disabled = false, label = '書き出す' }: ExportButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'inline-flex items-center gap-1 rounded-lg border border-green-600 px-3 py-1.5',
        'text-xs font-semibold text-green-700 hover:bg-green-50',
        'disabled:cursor-not-allowed disabled:opacity-50',
      )}
    >
      <span aria-hidden="true">⬇</span>
      <span>{label}</span>
    </button>
  );
}

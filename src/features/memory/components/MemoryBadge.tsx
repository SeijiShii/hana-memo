/**
 * 「去年の今頃」バッジ (UC1) — notebook ヘッダ右上の件数バッジ。
 *
 * - 件数 N >= 1 で表示「去年の今頃 N 件」。0 件は非表示 (charter §2.2「押し付けない」)。
 * - 3 桁以上は「99+」表記 (PLAN §6)。
 * - 押下で MemorySection (アンカー) へスクロール。スクロール挙動はアプリ層で配線できるよう
 *   onActivate を受け取り、未指定時は既定で同一ページ内のアンカーへスクロールする。
 * - a11y: aria-label「去年の今頃 N 件」(PLAN §6)。
 *
 * 関連: docs/memory/001_memory_SPEC.md §1 UC1, docs/memory/002_memory_PLAN.md §1/§6
 */
import { Flower } from 'lucide-react';
import { cn } from '../../../lib/utils';
import { MEMORY_SECTION_ANCHOR_ID } from './MemorySection';

/** バッジ表記上限 (これ以上は「99+」)。 */
export const MEMORY_BADGE_MAX = 99;

export type MemoryBadgeProps = {
  /** 前年同期間の件数。0 以下は非表示。 */
  count: number;
  /** 押下時 (未指定なら MemorySection アンカーへスクロール)。 */
  onActivate?: () => void;
};

/** 件数を表示用に整形 (上限超過は「99+」)。 */
function formatCount(count: number): string {
  return count > MEMORY_BADGE_MAX ? `${MEMORY_BADGE_MAX}+` : String(count);
}

/** 既定のスクロール動作: 同一ページ内の MemorySection アンカーへスクロールする。 */
function scrollToSection(): void {
  if (typeof document === 'undefined') return;
  const el = document.getElementById(MEMORY_SECTION_ANCHOR_ID);
  el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

/** notebook ヘッダの「去年の今頃 N 件」バッジ。0 件は非表示。 */
export function MemoryBadge({ count, onActivate }: MemoryBadgeProps) {
  if (count <= 0) return null;

  const label = `去年の今頃 ${count} 件`;

  return (
    <button
      type="button"
      aria-label={label}
      onClick={onActivate ?? scrollToSection}
      className={cn(
        'inline-flex items-center gap-1 rounded-pill bg-moss-light px-3 py-1 text-xs font-semibold text-moss-dark',
        'hover:bg-moss-light/70',
      )}
    >
      <Flower size={14} aria-hidden />
      <span aria-hidden="true">去年の今頃 {formatCount(count)}</span>
    </button>
  );
}

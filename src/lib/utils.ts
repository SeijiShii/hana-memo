/**
 * shadcn 互換のクラス結合ヘルパ。clsx で条件付き class をまとめ、tailwind-merge で
 * 競合する Tailwind utility (例: `px-2 px-4`) を後勝ちで解決する。
 *
 * 関連: docs/capture/002_capture_PLAN.md §1 (presentation foundation)
 */
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/** clsx + tailwind-merge を合成した className 結合関数。 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

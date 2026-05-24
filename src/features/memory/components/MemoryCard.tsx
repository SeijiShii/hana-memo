/**
 * 「去年の今頃」個別カード (UC2) — カルーセル 1 枚分。
 *
 * - サムネ + 表示名 (commonName、null は '不明') + 撮影日 (YYYY-MM-DD)。
 * - サムネ URL は呼び出し側が resolveThumbnail で注入 (storage 配線はアプリ層、既定はプレースホルダ)。
 * - 押下で onSelect を発火 (詳細遷移をアプリ層で配線。notebook DiscoveryDetailPage 想定)。
 *
 * データロジック (選定・キャッシュ) は recommend.ts / memoryApi.ts に委ね、本コンポーネントは表示専用。
 *
 * 関連: docs/memory/001_memory_SPEC.md §1 UC2, docs/memory/002_memory_PLAN.md §1 (MemoryCard)
 */
import { cn } from '../../../lib/utils';
import type { MemoryDiscovery } from '../recommend';

export type MemoryCardProps = {
  memory: MemoryDiscovery;
  /** discovery → サムネ画像 URL を解決する (null でプレースホルダ)。既定は常に null。 */
  resolveThumbnail?: (m: MemoryDiscovery) => string | null;
  /** カード押下時 (詳細遷移などをアプリ層で配線)。 */
  onSelect?: (m: MemoryDiscovery) => void;
};

/** ISO 文字列から日付部分 (YYYY-MM-DD) を取り出す。 */
function dateLabel(iso: string): string {
  return iso.slice(0, 10);
}

/** 「去年の今頃」カルーセルの 1 枚。サムネ + 名前 + 撮影日。 */
export function MemoryCard({ memory, resolveThumbnail, onSelect }: MemoryCardProps) {
  const thumb = resolveThumbnail?.(memory) ?? null;
  const name = memory.commonName || '不明';

  return (
    <button
      type="button"
      onClick={() => onSelect?.(memory)}
      className={cn(
        'flex w-32 shrink-0 snap-start flex-col gap-1 rounded-xl border border-neutral-200 bg-white p-2 text-left',
        'hover:bg-neutral-50',
      )}
    >
      {thumb ? (
        <img
          src={thumb}
          alt={name}
          className="aspect-square w-full rounded-lg object-cover"
        />
      ) : (
        <span
          aria-hidden="true"
          className="flex aspect-square w-full items-center justify-center rounded-lg bg-green-50 text-2xl"
        >
          🌿
        </span>
      )}
      <span className="truncate text-sm font-medium text-neutral-800">{name}</span>
      <span className="text-xs text-neutral-400">{dateLabel(memory.capturedAt)}</span>
    </button>
  );
}

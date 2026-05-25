/**
 * 「去年の今頃」セクション (UC2) — 前年同期間の発見を横スクロールカルーセルで並べる。
 *
 * - notebook タイムライン最上部 (今日の発見の直前) にマウントする想定。
 * - 0 件は何も描画しない (SPEC §1 UC2 / charter §2.2「押し付けない」: CTA も出さない)。
 * - カルーセルは純 CSS (overflow-x-auto + snap)。カルーセルライブラリは使わない。
 * - 見出しは h2 (PLAN §6 a11y)。各カードは MemoryCard に委譲。
 *
 * データ層 (useMemories: キャッシュ + silent fail) は token (アプリ層 auth 由来) を要するため、
 * 本コンポーネントは memories / loading を props で受け取る (capture/notebook の props-seam パターンに準拠)。
 * アプリ層 (App.tsx) で useMemories を呼んで本コンポーネントに流し込む。
 *
 * 関連: docs/memory/001_memory_SPEC.md §1 UC2, docs/memory/002_memory_PLAN.md §1/§6
 */
import { cn } from '../../../lib/utils';
import { MemoryCard } from './MemoryCard';
import type { MemoryDiscovery } from '../recommend';

/** セクションへスクロールするためのアンカー id (MemoryBadge タップ先、UC1)。 */
export const MEMORY_SECTION_ANCHOR_ID = 'memory-section';

export type MemorySectionProps = {
  /** 前年同期間の発見 (useMemories 由来)。既定 []。 */
  memories?: MemoryDiscovery[];
  /** 取得中フラグ (キャッシュ miss → fetch 中)。既定 false。 */
  loading?: boolean;
  /** discovery → サムネ画像 URL を解決する (null でプレースホルダ)。 */
  resolveThumbnail?: (m: MemoryDiscovery) => string | null;
  /** カード押下時 (詳細遷移をアプリ層で配線)。 */
  onSelect?: (m: MemoryDiscovery) => void;
};

/** 「去年の今頃」横スクロールカルーセル。0 件は非表示 (押し付けない)。 */
export function MemorySection({
  memories = [],
  loading = false,
  resolveThumbnail,
  onSelect,
}: MemorySectionProps) {
  // 取得中かつ未取得 → 控えめなローディング (空白を尊重しつつページは壊さない)。
  if (loading && memories.length === 0) {
    return (
      <section
        id={MEMORY_SECTION_ANCHOR_ID}
        aria-label="去年の今頃"
        className="flex flex-col gap-2"
      >
        <h2 className="text-sm font-semibold text-moss-dark">去年の今頃</h2>
        <p className="py-4 text-center text-xs text-ink-faint">読み込み中…</p>
      </section>
    );
  }

  // 0 件は何も描画しない (CTA も出さない)。
  if (memories.length === 0) {
    return null;
  }

  return (
    <section id={MEMORY_SECTION_ANCHOR_ID} aria-label="去年の今頃" className="flex flex-col gap-2">
      <h2 className="text-sm font-semibold text-moss-dark">去年の今頃</h2>
      <ul
        className={cn(
          'flex snap-x snap-mandatory gap-2 overflow-x-auto pb-1',
          '[scrollbar-width:none] [&::-webkit-scrollbar]:hidden',
        )}
      >
        {memories.map((m) => (
          <li key={m.id}>
            <MemoryCard memory={m} resolveThumbnail={resolveThumbnail} onSelect={onSelect} />
          </li>
        ))}
      </ul>
    </section>
  );
}

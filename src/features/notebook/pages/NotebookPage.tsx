/**
 * 発見ノート (図鑑) 画面 (UC1/UC2) — 4 モード (タイムライン / カレンダー / 地図 / 図鑑) の container。
 *
 * モードタブで表示を切り替え、同一 discovery データを各 view コンポーネントに渡す。
 *
 * データ配線: useNotebook は token (アプリ層 auth 由来) を要求するため、テスト容易性のため
 * 本画面は discovery 一覧と loading/error を props で受け取る (capture の props-seam パターンに準拠)。
 * アプリ層 (App.tsx) で useNotebook を呼んで本画面に流し込む想定。
 *
 * 状態表示:
 *   - loading かつ未取得 → ローディング表示
 *   - error → エラー表示
 *   - discovery 0 件 → 空状態「まだ発見がありません」
 *
 * 関連: docs/notebook/001_notebook_SPEC.md §1 UC1/UC2, docs/notebook/002_notebook_PLAN.md §4 Phase 1/4
 */
import { useState } from 'react';
import { cn } from '../../../lib/utils';
import { TimelineView } from '../components/TimelineView';
import { CalendarView } from '../components/CalendarView';
import { MapView } from '../components/MapView';
import { FigureView } from '../components/FigureView';
import { MemoryBadge, MemorySection, type MemoryDiscovery } from '../../memory';
import { SproutSpot } from '../../../components/illustrations/Botanical';
import type { NotebookDiscovery } from '../types';

export type NotebookViewMode = 'timeline' | 'calendar' | 'map' | 'figure';

const MODE_TABS: { mode: NotebookViewMode; label: string }[] = [
  { mode: 'timeline', label: 'タイムライン' },
  { mode: 'calendar', label: 'カレンダー' },
  { mode: 'map', label: '地図' },
  { mode: 'figure', label: '図鑑' },
];

export type NotebookPageProps = {
  /** filter + sort 適用済みの discovery 一覧 (アプリ層 useNotebook 由来)。既定 []。 */
  discoveries?: NotebookDiscovery[];
  /** 取得中フラグ。 */
  loading?: boolean;
  /** 取得エラー。 */
  error?: Error | null;
  /** 初期表示モード。既定 'timeline'。 */
  initialMode?: NotebookViewMode;
  /** discovery → サムネ URL を解決する (storage 配線、既定はプレースホルダ)。 */
  resolveThumbnail?: (d: NotebookDiscovery) => string | null;
  /** カード / タイル / ピン押下時 (詳細遷移をアプリ層で配線)。 */
  onSelect?: (d: NotebookDiscovery) => void;
  /**
   * 「去年の今頃」の前年同期間 discovery (memory useMemories 由来)。既定 []。
   * 0 件ならバッジ + セクションとも非表示 (SPEC §1 UC1/UC2 / charter §2.2)。
   */
  memories?: MemoryDiscovery[];
  /** memory 取得中フラグ (キャッシュ miss → fetch 中)。既定 false。 */
  memoriesLoading?: boolean;
  /** memory カード → サムネ URL を解決する (storage 配線、既定はプレースホルダ)。 */
  resolveMemoryThumbnail?: (m: MemoryDiscovery) => string | null;
  /** memory カード押下時 (詳細遷移をアプリ層で配線)。 */
  onSelectMemory?: (m: MemoryDiscovery) => void;
};

/** 発見ノート画面。モードタブで 4 view を切り替える。 */
export function NotebookPage({
  discoveries = [],
  loading = false,
  error = null,
  initialMode = 'timeline',
  resolveThumbnail,
  onSelect,
  memories = [],
  memoriesLoading = false,
  resolveMemoryThumbnail,
  onSelectMemory,
}: NotebookPageProps) {
  const [mode, setMode] = useState<NotebookViewMode>(initialMode);

  const renderBody = () => {
    // 取得中かつ未取得 → ローディング。取得済みでの追加ロード中は一覧を出し続ける。
    if (loading && discoveries.length === 0) {
      return <p className="py-12 text-center text-sm text-ink-faint">読み込み中…</p>;
    }
    if (error) {
      return <p className="py-12 text-center text-sm text-red-500">発見の取得に失敗しました</p>;
    }
    if (discoveries.length === 0) {
      return (
        <div className="flex flex-col items-center gap-3 py-12 text-center">
          <SproutSpot size={72} aria-hidden />
          <p className="text-sm text-ink-faint">まだ発見がありません</p>
        </div>
      );
    }
    switch (mode) {
      case 'timeline':
        return (
          <TimelineView
            discoveries={discoveries}
            resolveThumbnail={resolveThumbnail}
            onSelect={onSelect}
          />
        );
      case 'calendar':
        return <CalendarView discoveries={discoveries} onSelect={onSelect} />;
      case 'map':
        return <MapView discoveries={discoveries} onSelect={onSelect} />;
      case 'figure':
        return (
          <FigureView
            discoveries={discoveries}
            resolveThumbnail={resolveThumbnail}
            onSelect={onSelect}
          />
        );
    }
  };

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col gap-4 bg-paper p-4 text-ink">
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-xl font-bold text-moss-dark">発見ノート</h1>
        <div className="flex items-center gap-2">
          <MemoryBadge count={memories.length} />
        </div>
      </div>
      <MemorySection
        memories={memories}
        loading={memoriesLoading}
        resolveThumbnail={resolveMemoryThumbnail}
        onSelect={onSelectMemory}
      />
      <nav className="flex gap-1 rounded-xl bg-surface-soft p-1" aria-label="表示モード">
        {MODE_TABS.map((tab) => (
          <button
            key={tab.mode}
            type="button"
            onClick={() => setMode(tab.mode)}
            aria-pressed={mode === tab.mode}
            className={cn(
              'flex-1 whitespace-nowrap rounded-lg px-1 py-1.5 text-[11px] font-semibold',
              mode === tab.mode
                ? 'bg-surface text-moss-dark shadow-sm'
                : 'text-ink-faint hover:text-ink-soft',
            )}
          >
            {tab.label}
          </button>
        ))}
      </nav>
      <div>{renderBody()}</div>
    </main>
  );
}

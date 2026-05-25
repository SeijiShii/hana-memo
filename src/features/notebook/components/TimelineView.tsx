/**
 * タイムライン表示 (図鑑モード: timeline) — discovery を撮影日降順で日付ごとにグルーピングして並べる。
 *
 * - 並び順は notebook/grouping.ts の sortByCapturedAtDesc を再利用 (データロジックは再実装しない)。
 * - 日付見出し (YYYY-MM-DD) ごとに、その日の discovery を「サムネ + 名前 + 時刻」のカードで列挙する。
 * - 表示名は notebook/edit.ts の resolveDisplayName で解決 (ユーザ編集値 > AI 値 > original)。
 * - サムネは NotebookDiscovery に画像 URL を持たないため、呼び出し側が resolveThumbnail で注入する
 *   (storage useSignedUrl 配線はアプリ層の責務。既定はプレースホルダ表示)。
 *
 * 関連: docs/notebook/001_notebook_SPEC.md §1 UC1, §1 UC2 (timeline)
 */
import { Leaf } from 'lucide-react';
import { cn } from '../../../lib/utils';
import { sortByCapturedAtDesc } from '../grouping';
import { resolveDisplayName } from '../edit';
import type { NotebookDiscovery } from '../types';

export type TimelineViewProps = {
  discoveries: NotebookDiscovery[];
  /** discovery → サムネ画像 URL を解決する (null でプレースホルダ)。既定は常に null。 */
  resolveThumbnail?: (d: NotebookDiscovery) => string | null;
  /** カード押下時 (詳細遷移などをアプリ層で配線)。 */
  onSelect?: (d: NotebookDiscovery) => void;
};

/** ISO 文字列から日付部分 (YYYY-MM-DD) を取り出す。 */
function dateKey(iso: string): string {
  return iso.slice(0, 10);
}

/** ISO 文字列から時刻 (HH:MM) を取り出す。 */
function timeLabel(iso: string): string {
  return iso.slice(11, 16);
}

/** 撮影日降順のタイムライン。日付ごとにセクション化して discovery を並べる。 */
export function TimelineView({ discoveries, resolveThumbnail, onSelect }: TimelineViewProps) {
  const sorted = sortByCapturedAtDesc(discoveries);

  // 降順ソート済み配列を走査して、日付が変わるたびに新しいグループを開始する (順序保持)。
  const groups: { date: string; items: NotebookDiscovery[] }[] = [];
  for (const d of sorted) {
    const key = dateKey(d.capturedAt);
    const last = groups[groups.length - 1];
    if (last && last.date === key) {
      last.items.push(d);
    } else {
      groups.push({ date: key, items: [d] });
    }
  }

  return (
    <ul className="flex flex-col gap-6" aria-label="タイムライン">
      {groups.map((group) => (
        <li key={group.date} className="flex flex-col gap-2">
          <h3 className="text-sm font-semibold text-ink-faint">{group.date}</h3>
          <ul className="flex flex-col gap-2">
            {group.items.map((d) => {
              const thumb = resolveThumbnail?.(d) ?? null;
              return (
                <li key={d.id}>
                  <button
                    type="button"
                    onClick={() => onSelect?.(d)}
                    className={cn(
                      'flex w-full items-center gap-3 rounded-card border border-line bg-surface p-2 text-left',
                      'hover:bg-surface-soft',
                    )}
                  >
                    {thumb ? (
                      <img
                        src={thumb}
                        alt={resolveDisplayName(d)}
                        className="h-14 w-14 shrink-0 rounded-lg object-cover"
                      />
                    ) : (
                      <span
                        aria-hidden="true"
                        className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg bg-moss-light text-moss"
                      >
                        <Leaf size={22} aria-hidden />
                      </span>
                    )}
                    <span className="flex min-w-0 flex-col">
                      <span className="truncate text-sm font-medium text-ink">
                        {resolveDisplayName(d)}
                      </span>
                      <span className="text-xs text-ink-faint">{timeLabel(d.capturedAt)}</span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </li>
      ))}
    </ul>
  );
}

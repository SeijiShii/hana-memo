/**
 * カレンダー表示 (図鑑モード: calendar) — 月グリッドに撮影日マーカーを表示し、
 * 日付タップでその日の discovery 一覧を表示する。
 *
 * - 月の決定: month prop ('YYYY-MM')。未指定時は discovery のうち最新の撮影月、
 *   discovery が空なら当月。表示月の遷移 (前/次) は内部 state で持つ。
 * - マーカー: その日の撮影件数を日セルに表示する。件数 0 の日はマーカーなし。
 * - 日選択: 選択日の discovery を撮影日降順 (grouping.sortByCapturedAtDesc) で一覧表示。
 * - 日付の比較は ISO 文字列の YYYY-MM-DD 前方一致で行い、ローカルタイムゾーン変換を避ける
 *   (capturedAt は ISO 8601 / UTC、表示は日付部分のみで十分なため)。
 *
 * 関連: docs/notebook/001_notebook_SPEC.md §1 UC2 (カレンダー)
 */
import { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '../../../lib/utils';
import { sortByCapturedAtDesc } from '../grouping';
import { resolveDisplayName } from '../edit';
import type { NotebookDiscovery } from '../types';

export type CalendarViewProps = {
  discoveries: NotebookDiscovery[];
  /** 初期表示月 'YYYY-MM'。未指定なら最新 discovery の月 or 当月。 */
  month?: string;
  onSelect?: (d: NotebookDiscovery) => void;
};

const WEEKDAY_LABELS = ['日', '月', '火', '水', '木', '金', '土'] as const;

/** 'YYYY-MM' を { year, month0 } (month0 は 0 始まり) に分解。 */
function parseMonth(ym: string): { year: number; month0: number } {
  const [y, m] = ym.split('-');
  return { year: Number(y), month0: Number(m) - 1 };
}

/** { year, month0 } を 'YYYY-MM' に整形。 */
function formatMonth(year: number, month0: number): string {
  return `${year}-${String(month0 + 1).padStart(2, '0')}`;
}

/** 表示月の初期値を決める (最新 discovery の月 or 当月)。 */
function initialMonth(discoveries: NotebookDiscovery[], month?: string): string {
  if (month) return month;
  const sorted = sortByCapturedAtDesc(discoveries);
  const latest = sorted[0];
  if (latest) return latest.capturedAt.slice(0, 7);
  const now = new Date();
  return formatMonth(now.getFullYear(), now.getMonth());
}

/** 月グリッド + 日マーカー + 選択日の discovery 一覧。 */
export function CalendarView({ discoveries, month, onSelect }: CalendarViewProps) {
  const [currentMonth, setCurrentMonth] = useState(() => initialMonth(discoveries, month));
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const { year, month0 } = parseMonth(currentMonth);

  // 撮影日 (YYYY-MM-DD) ごとの件数を集計する。
  const countByDate = useMemo(() => {
    const map = new Map<string, number>();
    for (const d of discoveries) {
      const key = d.capturedAt.slice(0, 10);
      map.set(key, (map.get(key) ?? 0) + 1);
    }
    return map;
  }, [discoveries]);

  // 当月の日セル + 先頭の曜日オフセット (空セル) を組み立てる。
  const cells = useMemo(() => {
    const firstWeekday = new Date(year, month0, 1).getDay();
    const daysInMonth = new Date(year, month0 + 1, 0).getDate();
    const out: (number | null)[] = [];
    for (let i = 0; i < firstWeekday; i += 1) out.push(null);
    for (let day = 1; day <= daysInMonth; day += 1) out.push(day);
    return out;
  }, [year, month0]);

  const selectedItems = useMemo(() => {
    if (!selectedDate) return [];
    const items = discoveries.filter((d) => d.capturedAt.slice(0, 10) === selectedDate);
    return sortByCapturedAtDesc(items);
  }, [discoveries, selectedDate]);

  const goMonth = (delta: number) => {
    const next = new Date(year, month0 + delta, 1);
    setCurrentMonth(formatMonth(next.getFullYear(), next.getMonth()));
    setSelectedDate(null);
  };

  return (
    <div className="flex flex-col gap-4" aria-label="カレンダー">
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => goMonth(-1)}
          aria-label="前の月"
          className="rounded-lg px-3 py-1 text-sm text-ink-faint hover:bg-surface-soft"
        >
          <ChevronLeft size={18} aria-hidden />
        </button>
        <span className="text-sm font-semibold text-ink-soft">{currentMonth}</span>
        <button
          type="button"
          onClick={() => goMonth(1)}
          aria-label="次の月"
          className="rounded-lg px-3 py-1 text-sm text-ink-faint hover:bg-surface-soft"
        >
          <ChevronRight size={18} aria-hidden />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center">
        {WEEKDAY_LABELS.map((w) => (
          <span key={w} className="text-xs text-ink-faint">
            {w}
          </span>
        ))}
        {cells.map((day, idx) => {
          if (day === null) {
            // 月初前の空セル。
            return <span key={`pad-${idx}`} aria-hidden="true" />;
          }
          const dateStr = `${currentMonth}-${String(day).padStart(2, '0')}`;
          const count = countByDate.get(dateStr) ?? 0;
          const hasDiscovery = count > 0;
          const isSelected = selectedDate === dateStr;
          return (
            <button
              key={dateStr}
              type="button"
              onClick={() => setSelectedDate(dateStr)}
              aria-label={hasDiscovery ? `${dateStr} (${count}件の発見)` : dateStr}
              className={cn(
                'flex aspect-square flex-col items-center justify-center rounded-lg text-sm',
                'hover:bg-surface-soft',
                isSelected && 'bg-moss-light',
                hasDiscovery ? 'font-semibold text-ink' : 'text-ink-faint',
              )}
            >
              {day}
              {hasDiscovery ? (
                <span
                  data-testid={`marker-${dateStr}`}
                  aria-hidden="true"
                  className="mt-0.5 h-1.5 w-1.5 rounded-full bg-moss"
                />
              ) : null}
            </button>
          );
        })}
      </div>

      {selectedDate ? (
        <div className="flex flex-col gap-2">
          <h3 className="text-sm font-semibold text-ink-faint">{selectedDate}</h3>
          {selectedItems.length > 0 ? (
            <ul className="flex flex-col gap-1">
              {selectedItems.map((d) => (
                <li key={d.id}>
                  <button
                    type="button"
                    onClick={() => onSelect?.(d)}
                    className="w-full rounded-lg border border-line bg-surface p-2 text-left text-sm text-ink hover:bg-surface-soft"
                  >
                    {resolveDisplayName(d)}
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-ink-faint">この日の発見はありません</p>
          )}
        </div>
      ) : null}
    </div>
  );
}

/**
 * 図鑑表示 (図鑑モード: figure) — scientific_name 別グループのサムネタイルギャラリー。
 *
 * - グルーピングは notebook/grouping.ts の groupBySpecies を再利用 (null は '__unknown__' に集約)。
 * - 各タイルは「サムネ + 表示名」。種ごとに見出しを付け、その種に属する discovery をグリッドで並べる。
 * - サムネ URL は呼び出し側が resolveThumbnail で注入 (storage 配線はアプリ層、既定はプレースホルダ)。
 *
 * 関連: docs/notebook/001_notebook_SPEC.md §1 UC2 (図鑑)
 */
import { cn } from '../../../lib/utils';
import { groupBySpecies } from '../grouping';
import { resolveDisplayName } from '../edit';
import type { NotebookDiscovery } from '../types';

const UNKNOWN_SPECIES_KEY = '__unknown__';

export type FigureViewProps = {
  discoveries: NotebookDiscovery[];
  resolveThumbnail?: (d: NotebookDiscovery) => string | null;
  onSelect?: (d: NotebookDiscovery) => void;
};

/** scientific_name 別グルーピングのサムネタイル図鑑。 */
export function FigureView({ discoveries, resolveThumbnail, onSelect }: FigureViewProps) {
  const groups = groupBySpecies(discoveries);
  const speciesKeys = Object.keys(groups);

  return (
    <div className="flex flex-col gap-6" aria-label="図鑑">
      {speciesKeys.map((species) => {
        const items = groups[species] ?? [];
        const heading = species === UNKNOWN_SPECIES_KEY ? '学名不明' : species;
        return (
          <section key={species} className="flex flex-col gap-2">
            <h3 className="text-sm font-semibold italic text-neutral-500">{heading}</h3>
            <ul className="grid grid-cols-3 gap-2">
              {items.map((d) => {
                const thumb = resolveThumbnail?.(d) ?? null;
                return (
                  <li key={d.id}>
                    <button
                      type="button"
                      onClick={() => onSelect?.(d)}
                      className={cn(
                        'flex w-full flex-col items-center gap-1 rounded-xl border border-neutral-200 bg-white p-2',
                        'hover:bg-neutral-50',
                      )}
                    >
                      {thumb ? (
                        <img
                          src={thumb}
                          alt={resolveDisplayName(d)}
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
                      <span className="w-full truncate text-center text-xs text-neutral-700">
                        {resolveDisplayName(d)}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}
    </div>
  );
}

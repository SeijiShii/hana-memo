/**
 * 地図表示 (図鑑モード: map) — discovery の location をピン表示する。
 *
 * ⚠️ 地図タイル描画は **意図的に未実装 (deferred)**。実地図には外部タイルプロバイダ / 地図ライブラリ
 * (PLAN §1/§8 で MapLibre + OpenStreetMap を想定) が必要で、コスト・利用規約・API キーの意思決定を伴う。
 * 可逆性のため重い / 有料の地図 SDK は導入せず、本コンポーネントは「データ準備済みシェル」として
 * 次を担う:
 *   - location を持つ discovery のみ抽出 (location null は除外 — SPEC §1 UC2 地図の仕様)
 *   - 座標リストを軽量に列挙 + 「地図表示は準備中」プレースホルダを表示
 * 将来 MapLibre 等を入れる際は、本シェルが算出する withCoords をそのままピン化すればよい。
 * 地図プロバイダの選定は人間の意思決定待ち (Leaflet+OSM が無料の有力候補)。
 *
 * 関連: docs/notebook/001_notebook_SPEC.md §1 UC2 (地図), 002_notebook_PLAN.md §8 (MapLibre 注意点)
 */
import { MapPin } from 'lucide-react';
import { resolveDisplayName } from '../edit';
import type { NotebookDiscovery } from '../types';

/** location を持つ discovery (ピン化対象)。location を非 null に絞り込んだ型。 */
export type DiscoveryWithCoords = NotebookDiscovery & {
  location: { lat: number; lng: number };
};

/** location を持つ discovery だけを抽出する (null 除外、ピン化対象)。 */
export function discoveriesWithCoords(discoveries: NotebookDiscovery[]): DiscoveryWithCoords[] {
  return discoveries.filter((d): d is DiscoveryWithCoords => d.location != null);
}

export type MapViewProps = {
  discoveries: NotebookDiscovery[];
  onSelect?: (d: DiscoveryWithCoords) => void;
};

/** 地図シェル。座標付き discovery を列挙し、実地図タイルは deferred とする。 */
export function MapView({ discoveries, onSelect }: MapViewProps) {
  const withCoords = discoveriesWithCoords(discoveries);

  return (
    <div className="flex flex-col gap-3" aria-label="地図">
      <div className="flex flex-col items-center gap-1 rounded-2xl bg-surface-soft p-6 text-center">
        <MapPin size={32} aria-hidden className="text-moss" />
        <p className="text-sm font-semibold text-ink-soft">地図表示は準備中</p>
        <p className="text-xs text-ink-faint">位置情報のある発見 {withCoords.length} 件</p>
      </div>

      {withCoords.length > 0 ? (
        <ul className="flex flex-col gap-1">
          {withCoords.map((d) => (
            <li key={d.id}>
              <button
                type="button"
                onClick={() => onSelect?.(d)}
                className="flex w-full items-center justify-between gap-2 rounded-lg border border-line bg-surface p-2 text-left text-sm hover:bg-surface-soft"
              >
                <span className="truncate text-ink">{resolveDisplayName(d)}</span>
                <span className="shrink-0 text-xs text-ink-faint">
                  {d.location.lat.toFixed(4)}, {d.location.lng.toFixed(4)}
                </span>
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-ink-faint">位置情報のある発見はまだありません</p>
      )}
    </div>
  );
}

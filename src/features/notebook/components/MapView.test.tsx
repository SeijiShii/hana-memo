// @vitest-environment happy-dom
/**
 * MapView 単体テスト
 * 由来: docs/notebook/001_notebook_SPEC.md §1 UC2 (地図、location null 除外)
 * 注: 実地図タイルは deferred (シェル)。座標抽出 + プレースホルダの振る舞いを検証する。
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MapView, discoveriesWithCoords } from './MapView';
import type { NotebookDiscovery } from '../types';

function disc(
  id: string,
  location: { lat: number; lng: number } | null,
  over: Partial<NotebookDiscovery> = {},
): NotebookDiscovery {
  return {
    id,
    commonName: id,
    scientificName: null,
    status: 'identified',
    capturedAt: '2026-04-01T09:00:00Z',
    season: 'spring',
    location,
    ...over,
  };
}

describe('discoveriesWithCoords', () => {
  it('location null を除外し座標付きのみ返す', () => {
    const out = discoveriesWithCoords([
      disc('a', { lat: 35, lng: 139 }),
      disc('b', null),
    ]);
    expect(out.map((d) => d.id)).toEqual(['a']);
  });
});

describe('MapView', () => {
  it('準備中プレースホルダと座標件数を表示する', () => {
    render(<MapView discoveries={[disc('a', { lat: 35.1, lng: 139.2 })]} />);
    expect(screen.getByText('地図表示は準備中')).toBeTruthy();
    expect(screen.getByText(/位置情報のある発見 1 件/)).toBeTruthy();
  });

  it('座標付き discovery を座標つきで列挙する', () => {
    render(
      <MapView
        discoveries={[disc('a', { lat: 35.1234, lng: 139.5678 }, { commonName: 'タンポポ' })]}
      />,
    );
    expect(screen.getByText('タンポポ')).toBeTruthy();
    expect(screen.getByText(/35\.1234, 139\.5678/)).toBeTruthy();
  });

  it('座標なし (全件 location null) でもクラッシュせず案内を出す', () => {
    render(<MapView discoveries={[disc('a', null), disc('b', null)]} />);
    expect(screen.getByText(/位置情報のある発見 0 件/)).toBeTruthy();
    expect(screen.getByText('位置情報のある発見はまだありません')).toBeTruthy();
  });

  it('discovery 空でもクラッシュしない', () => {
    render(<MapView discoveries={[]} />);
    expect(screen.getByText('地図表示は準備中')).toBeTruthy();
  });

  it('座標項目押下で onSelect を発火する', () => {
    const onSelect = vi.fn();
    const d = disc('a', { lat: 35, lng: 139 });
    render(<MapView discoveries={[d]} onSelect={onSelect} />);
    fireEvent.click(screen.getByText('a'));
    expect(onSelect).toHaveBeenCalledWith(d);
  });
});

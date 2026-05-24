// @vitest-environment happy-dom
/**
 * FigureView 単体テスト
 * 由来: docs/notebook/001_notebook_SPEC.md §1 UC2 (図鑑、scientific_name 別グルーピング)
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { FigureView } from './FigureView';
import type { NotebookDiscovery } from '../types';

function disc(
  id: string,
  scientificName: string | null,
  over: Partial<NotebookDiscovery> = {},
): NotebookDiscovery {
  return {
    id,
    commonName: id,
    scientificName,
    status: 'identified',
    capturedAt: '2026-04-01T09:00:00Z',
    season: 'spring',
    location: null,
    ...over,
  };
}

describe('FigureView', () => {
  it('全 discovery のタイルを描画する (件数一致)', () => {
    render(
      <FigureView
        discoveries={[disc('a', 'Taraxacum'), disc('b', 'Taraxacum'), disc('c', 'Trifolium')]}
      />,
    );
    const tiles = within(screen.getByLabelText('図鑑')).getAllByRole('button');
    expect(tiles).toHaveLength(3);
  });

  it('scientific_name 別にセクション見出しを出す', () => {
    render(<FigureView discoveries={[disc('a', 'Taraxacum'), disc('c', 'Trifolium')]} />);
    expect(screen.getByText('Taraxacum')).toBeTruthy();
    expect(screen.getByText('Trifolium')).toBeTruthy();
  });

  it('scientific_name が null のグループは「学名不明」見出し', () => {
    render(<FigureView discoveries={[disc('a', null)]} />);
    expect(screen.getByText('学名不明')).toBeTruthy();
  });

  it('タイル押下で onSelect を発火する', () => {
    const onSelect = vi.fn();
    const d = disc('a', 'Taraxacum');
    render(<FigureView discoveries={[d]} onSelect={onSelect} />);
    fireEvent.click(within(screen.getByLabelText('図鑑')).getByRole('button'));
    expect(onSelect).toHaveBeenCalledWith(d);
  });
});

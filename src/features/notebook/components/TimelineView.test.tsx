// @vitest-environment happy-dom
/**
 * TimelineView 単体テスト
 * 由来: docs/notebook/001_notebook_SPEC.md §1 UC1/UC2 (timeline、撮影日降順 + 日付グルーピング)
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { TimelineView } from './TimelineView';
import type { NotebookDiscovery } from '../types';

function disc(id: string, capturedAt: string, over: Partial<NotebookDiscovery> = {}): NotebookDiscovery {
  return {
    id,
    commonName: id,
    scientificName: null,
    status: 'identified',
    capturedAt,
    season: 'spring',
    location: null,
    ...over,
  };
}

describe('TimelineView', () => {
  it('日付見出しを撮影日降順で表示する', () => {
    render(
      <TimelineView
        discoveries={[
          disc('a', '2026-04-01T09:00:00Z'),
          disc('b', '2026-05-02T09:00:00Z'),
          disc('c', '2026-05-02T11:00:00Z'),
        ]}
      />,
    );
    const headings = screen.getAllByRole('heading', { level: 3 }).map((h) => h.textContent);
    expect(headings).toEqual(['2026-05-02', '2026-04-01']); // desc, 同日は 1 見出し
  });

  it('同じ日の discovery は同一日付セクションにまとめる', () => {
    render(
      <TimelineView
        discoveries={[disc('b', '2026-05-02T09:00:00Z'), disc('c', '2026-05-02T11:00:00Z')]}
      />,
    );
    const headings = screen.getAllByRole('heading', { level: 3 });
    expect(headings).toHaveLength(1);
  });

  it('表示名 (resolveDisplayName: 編集値優先) を表示する', () => {
    render(
      <TimelineView
        discoveries={[disc('a', '2026-04-01T09:00:00Z', { userOverriddenName: 'セイヨウタンポポ' })]}
      />,
    );
    expect(screen.getByText('セイヨウタンポポ')).toBeTruthy();
  });

  it('resolveThumbnail で URL が返れば img を表示する', () => {
    render(
      <TimelineView
        discoveries={[disc('a', '2026-04-01T09:00:00Z', { commonName: 'タンポポ' })]}
        resolveThumbnail={() => 'https://example.test/thumb.webp'}
      />,
    );
    const img = screen.getByAltText('タンポポ') as HTMLImageElement;
    expect(img.src).toBe('https://example.test/thumb.webp');
  });

  it('カード押下で onSelect を発火する', () => {
    const onSelect = vi.fn();
    const d = disc('a', '2026-04-01T09:00:00Z');
    render(<TimelineView discoveries={[d]} onSelect={onSelect} />);
    fireEvent.click(within(screen.getByLabelText('タイムライン')).getByRole('button'));
    expect(onSelect).toHaveBeenCalledWith(d);
  });
});

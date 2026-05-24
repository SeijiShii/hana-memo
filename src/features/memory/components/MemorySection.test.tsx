// @vitest-environment happy-dom
/**
 * MemorySection 単体テスト
 * 由来: docs/memory/001_memory_SPEC.md §1 UC2 (横スクロールカルーセル / 0 件非表示 / 見出し h2)
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { MemorySection, MEMORY_SECTION_ANCHOR_ID } from './MemorySection';
import type { MemoryDiscovery } from '../recommend';

function mem(id: string, capturedAt: string, over: Partial<MemoryDiscovery> = {}): MemoryDiscovery {
  return {
    id,
    commonName: id,
    status: 'identified',
    capturedAt,
    season: 'spring',
    location: null,
    ...over,
  };
}

describe('MemorySection', () => {
  it('memories の件数だけカードを描画する', () => {
    render(
      <MemorySection
        memories={[
          mem('a', '2025-05-10T09:00:00Z'),
          mem('b', '2025-05-20T09:00:00Z'),
          mem('c', '2025-05-30T09:00:00Z'),
        ]}
      />,
    );
    const list = screen.getByLabelText('去年の今頃');
    expect(within(list).getAllByRole('button')).toHaveLength(3);
  });

  it('見出し「去年の今頃」を h2 で表示する', () => {
    render(<MemorySection memories={[mem('a', '2025-05-10T09:00:00Z')]} />);
    const h2 = screen.getByRole('heading', { level: 2 });
    expect(h2.textContent).toBe('去年の今頃');
  });

  it('セクションにアンカー id を付与する (バッジタップ先)', () => {
    const { container } = render(
      <MemorySection memories={[mem('a', '2025-05-10T09:00:00Z')]} />,
    );
    expect(container.querySelector(`#${MEMORY_SECTION_ANCHOR_ID}`)).toBeTruthy();
  });

  it('0 件 → 何も描画しない (押し付けない / CTA なし)', () => {
    const { container } = render(<MemorySection memories={[]} />);
    expect(container.firstChild).toBeNull();
    expect(screen.queryByText('去年の今頃')).toBeNull();
  });

  it('loading かつ未取得 → ローディング表示 (見出しは出す)', () => {
    render(<MemorySection memories={[]} loading />);
    expect(screen.getByText('読み込み中…')).toBeTruthy();
    expect(screen.getByRole('heading', { level: 2 })).toBeTruthy();
  });

  it('カード押下で onSelect を発火する', () => {
    const onSelect = vi.fn();
    const m = mem('a', '2025-05-10T09:00:00Z');
    render(<MemorySection memories={[m]} onSelect={onSelect} />);
    fireEvent.click(within(screen.getByLabelText('去年の今頃')).getByRole('button'));
    expect(onSelect).toHaveBeenCalledWith(m);
  });

  it('resolveThumbnail を各カードへ伝播する', () => {
    render(
      <MemorySection
        memories={[mem('a', '2025-05-10T09:00:00Z', { commonName: 'タンポポ' })]}
        resolveThumbnail={() => 'https://example.test/t.webp'}
      />,
    );
    const img = screen.getByAltText('タンポポ') as HTMLImageElement;
    expect(img.src).toBe('https://example.test/t.webp');
  });
});

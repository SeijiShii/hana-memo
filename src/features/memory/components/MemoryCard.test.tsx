// @vitest-environment happy-dom
/**
 * MemoryCard 単体テスト
 * 由来: docs/memory/001_memory_SPEC.md §1 UC2 (カード: 画像 + name + 撮影日 + 詳細リンク)
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryCard } from './MemoryCard';
import type { MemoryDiscovery } from '../recommend';

function mem(over: Partial<MemoryDiscovery> = {}): MemoryDiscovery {
  return {
    id: 'm1',
    commonName: 'サクラ',
    status: 'identified',
    capturedAt: '2025-05-20T09:00:00Z',
    season: 'spring',
    location: null,
    ...over,
  };
}

describe('MemoryCard', () => {
  it('名前と撮影日 (YYYY-MM-DD) を表示する', () => {
    render(<MemoryCard memory={mem()} />);
    expect(screen.getByText('サクラ')).toBeTruthy();
    expect(screen.getByText('2025-05-20')).toBeTruthy();
  });

  it('commonName が null なら「不明」を表示する', () => {
    render(<MemoryCard memory={mem({ commonName: null })} />);
    expect(screen.getByText('不明')).toBeTruthy();
  });

  it('resolveThumbnail で URL が返れば img を表示する', () => {
    render(
      <MemoryCard
        memory={mem({ commonName: 'タンポポ' })}
        resolveThumbnail={() => 'https://example.test/thumb.webp'}
      />,
    );
    const img = screen.getByAltText('タンポポ') as HTMLImageElement;
    expect(img.src).toBe('https://example.test/thumb.webp');
  });

  it('サムネ未解決時はプレースホルダ (img なし)', () => {
    render(<MemoryCard memory={mem({ commonName: 'タンポポ' })} />);
    expect(screen.queryByAltText('タンポポ')).toBeNull();
  });

  it('押下で onSelect を発火する', () => {
    const onSelect = vi.fn();
    const m = mem();
    render(<MemoryCard memory={m} onSelect={onSelect} />);
    fireEvent.click(screen.getByRole('button'));
    expect(onSelect).toHaveBeenCalledWith(m);
  });
});

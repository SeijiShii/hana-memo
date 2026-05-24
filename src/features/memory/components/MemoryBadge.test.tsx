// @vitest-environment happy-dom
/**
 * MemoryBadge 単体テスト
 * 由来: docs/memory/001_memory_SPEC.md §1 UC1 (件数バッジ / 0 件非表示 / 99+ / a11y)
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryBadge } from './MemoryBadge';

describe('MemoryBadge', () => {
  it('件数 >= 1 で「去年の今頃 N」を表示する', () => {
    render(<MemoryBadge count={3} />);
    expect(screen.getByText('去年の今頃 3')).toBeTruthy();
  });

  it('aria-label は「去年の今頃 N 件」(スクリーンリーダー読み上げ)', () => {
    render(<MemoryBadge count={3} />);
    expect(screen.getByLabelText('去年の今頃 3 件')).toBeTruthy();
  });

  it('0 件 → 非表示 (押し付けない)', () => {
    const { container } = render(<MemoryBadge count={0} />);
    expect(container.firstChild).toBeNull();
  });

  it('負数 → 非表示', () => {
    const { container } = render(<MemoryBadge count={-1} />);
    expect(container.firstChild).toBeNull();
  });

  it('100 件以上は「99+」表記', () => {
    render(<MemoryBadge count={150} />);
    expect(screen.getByText('去年の今頃 99+')).toBeTruthy();
  });

  it('99 件はそのまま (境界)', () => {
    render(<MemoryBadge count={99} />);
    expect(screen.getByText('去年の今頃 99')).toBeTruthy();
  });

  it('押下で onActivate を発火する', () => {
    const onActivate = vi.fn();
    render(<MemoryBadge count={3} onActivate={onActivate} />);
    fireEvent.click(screen.getByRole('button'));
    expect(onActivate).toHaveBeenCalledTimes(1);
  });

  it('onActivate 未指定でも押下でクラッシュしない (既定スクロール)', () => {
    render(<MemoryBadge count={3} />);
    expect(() => fireEvent.click(screen.getByRole('button'))).not.toThrow();
  });
});

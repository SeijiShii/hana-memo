// @vitest-environment happy-dom
/**
 * ExportButton 単体テスト
 * 由来: docs/export/001_export_SPEC.md §1 UC1/UC2/UC4 §6.1 (削除予約 disable)
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ExportButton } from './ExportButton';

describe('ExportButton', () => {
  it('既定文言「書き出す」を表示する', () => {
    render(<ExportButton onClick={vi.fn()} />);
    expect(screen.getByRole('button', { name: /書き出す/ })).toBeTruthy();
  });

  it('押下で onClick を起動する', () => {
    const onClick = vi.fn();
    render(<ExportButton onClick={onClick} />);
    fireEvent.click(screen.getByRole('button', { name: /書き出す/ }));
    expect(onClick).toHaveBeenCalledOnce();
  });

  it('label を上書きできる', () => {
    render(<ExportButton onClick={vi.fn()} label="エクスポート" />);
    expect(screen.getByRole('button', { name: /エクスポート/ })).toBeTruthy();
  });

  it('disabled=true (削除予約 user) → 押下しても onClick を起動しない (SPEC §6.1)', () => {
    const onClick = vi.fn();
    render(<ExportButton onClick={onClick} disabled />);
    const btn = screen.getByRole('button', { name: /書き出す/ }) as HTMLButtonElement;
    expect(btn.disabled).toBe(true);
    fireEvent.click(btn);
    expect(onClick).not.toHaveBeenCalled();
  });
});

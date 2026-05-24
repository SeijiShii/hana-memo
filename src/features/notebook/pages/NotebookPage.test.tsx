// @vitest-environment happy-dom
/**
 * NotebookPage 単体テスト
 * 由来: docs/notebook/001_notebook_SPEC.md §1 UC1/UC2 (4 モード切替 / 空 / loading)
 */
import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { NotebookPage } from './NotebookPage';
import type { NotebookDiscovery } from '../types';

function disc(over: Partial<NotebookDiscovery> = {}): NotebookDiscovery {
  return {
    id: 'd1',
    commonName: 'タンポポ',
    scientificName: 'Taraxacum',
    status: 'identified',
    capturedAt: '2026-04-10T09:00:00Z',
    season: 'spring',
    location: null,
    ...over,
  };
}

describe('NotebookPage', () => {
  it('モード切替タブ (4 モード) を表示する', () => {
    render(<NotebookPage discoveries={[disc()]} />);
    expect(screen.getByRole('button', { name: 'タイムライン' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'カレンダー' })).toBeTruthy();
    expect(screen.getByRole('button', { name: '地図' })).toBeTruthy();
    expect(screen.getByRole('button', { name: '図鑑' })).toBeTruthy();
  });

  it('既定はタイムライン表示 (aria-pressed)', () => {
    render(<NotebookPage discoveries={[disc()]} />);
    expect(screen.getByRole('button', { name: 'タイムライン' }).getAttribute('aria-pressed')).toBe(
      'true',
    );
    expect(screen.getByLabelText('タイムライン')).toBeTruthy();
  });

  it('地図タブ押下で MapView (地図) を表示する', () => {
    render(<NotebookPage discoveries={[disc({ location: { lat: 35, lng: 139 } })]} />);
    fireEvent.click(screen.getByRole('button', { name: '地図' }));
    expect(screen.getByLabelText('地図')).toBeTruthy();
    expect(screen.queryByLabelText('タイムライン')).toBeNull();
  });

  it('図鑑タブ押下で FigureView (図鑑) を表示する', () => {
    render(<NotebookPage discoveries={[disc()]} />);
    fireEvent.click(screen.getByRole('button', { name: '図鑑' }));
    expect(screen.getByLabelText('図鑑')).toBeTruthy();
  });

  it('カレンダータブ押下で CalendarView (カレンダー) を表示する', () => {
    render(<NotebookPage discoveries={[disc()]} />);
    fireEvent.click(screen.getByRole('button', { name: 'カレンダー' }));
    expect(screen.getByLabelText('カレンダー')).toBeTruthy();
  });

  it('discovery 0 件 → 空状態を表示する', () => {
    render(<NotebookPage discoveries={[]} />);
    expect(screen.getByText('まだ発見がありません')).toBeTruthy();
  });

  it('loading かつ未取得 → ローディング表示', () => {
    render(<NotebookPage discoveries={[]} loading />);
    expect(screen.getByText('読み込み中…')).toBeTruthy();
    expect(screen.queryByText('まだ発見がありません')).toBeNull();
  });

  it('error → エラー表示', () => {
    render(<NotebookPage discoveries={[]} error={new Error('boom')} />);
    expect(screen.getByText('発見の取得に失敗しました')).toBeTruthy();
  });
});

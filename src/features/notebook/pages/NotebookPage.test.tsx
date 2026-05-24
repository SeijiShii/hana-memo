// @vitest-environment happy-dom
/**
 * NotebookPage 単体テスト
 * 由来: docs/notebook/001_notebook_SPEC.md §1 UC1/UC2 (4 モード切替 / 空 / loading)
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { NotebookPage } from './NotebookPage';
import type { NotebookDiscovery } from '../types';
import type { MemoryDiscovery } from '../../memory';

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

function mem(id: string, over: Partial<MemoryDiscovery> = {}): MemoryDiscovery {
  return {
    id,
    commonName: id,
    status: 'identified',
    capturedAt: '2025-04-10T09:00:00Z',
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

  it('memories ありで「去年の今頃」セクション + バッジを表示する (UC1/UC2)', () => {
    render(<NotebookPage discoveries={[disc()]} memories={[mem('a'), mem('b')]} />);
    expect(screen.getByLabelText('去年の今頃')).toBeTruthy();
    expect(screen.getByLabelText('去年の今頃 2 件')).toBeTruthy();
  });

  it('memories 0 件 → セクション + バッジ非表示 (押し付けない)', () => {
    render(<NotebookPage discoveries={[disc()]} memories={[]} />);
    expect(screen.queryByLabelText('去年の今頃')).toBeNull();
    expect(screen.queryByLabelText(/去年の今頃 .* 件/)).toBeNull();
  });

  it('memory props 未指定でも従来どおり描画する (後方互換)', () => {
    render(<NotebookPage discoveries={[disc()]} />);
    expect(screen.getByText('発見ノート')).toBeTruthy();
    expect(screen.queryByLabelText('去年の今頃')).toBeNull();
  });

  it('memory カード押下で onSelectMemory を発火する', () => {
    const onSelectMemory = vi.fn();
    const m = mem('a');
    render(<NotebookPage discoveries={[disc()]} memories={[m]} onSelectMemory={onSelectMemory} />);
    fireEvent.click(within(screen.getByLabelText('去年の今頃')).getByRole('button'));
    expect(onSelectMemory).toHaveBeenCalledWith(m);
  });

  it('exportProps 未指定 → 書き出しボタン非表示 (後方互換)', () => {
    render(<NotebookPage discoveries={[disc()]} />);
    expect(screen.queryByRole('button', { name: /書き出す/ })).toBeNull();
  });

  it('exportProps ありで書き出しボタンを表示し、押下で ExportDialog を開く', () => {
    render(<NotebookPage discoveries={[disc()]} exportProps={{ onExportCsv: vi.fn() }} />);
    const trigger = screen.getByRole('button', { name: /書き出す/ });
    expect(trigger).toBeTruthy();
    expect(screen.queryByRole('dialog')).toBeNull();
    fireEvent.click(trigger);
    expect(screen.getByRole('dialog', { name: 'データを書き出す' })).toBeTruthy();
  });

  it('exportDisabled=true (削除予約 user) → 書き出しボタン disabled (SPEC §6.1)', () => {
    render(
      <NotebookPage discoveries={[disc()]} exportProps={{ onExportCsv: vi.fn() }} exportDisabled />,
    );
    expect((screen.getByRole('button', { name: /書き出す/ }) as HTMLButtonElement).disabled).toBe(
      true,
    );
  });
});

// @vitest-environment happy-dom
/**
 * CalendarView 単体テスト
 * 由来: docs/notebook/001_notebook_SPEC.md §1 UC2 (カレンダー、撮影日マーカー + 日タップで当日一覧)
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { CalendarView } from './CalendarView';
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

describe('CalendarView', () => {
  it('月グリッドを表示する (曜日見出し + 月ラベル)', () => {
    render(<CalendarView discoveries={[disc('a', '2026-04-10T09:00:00Z')]} month="2026-04" />);
    expect(screen.getByText('2026-04')).toBeTruthy();
    expect(screen.getByText('日')).toBeTruthy();
    expect(screen.getByText('土')).toBeTruthy();
    // 4 月は 30 日。
    expect(screen.getByRole('button', { name: /2026-04-30/ })).toBeTruthy();
  });

  it('撮影のある日にはマーカーを表示する', () => {
    render(<CalendarView discoveries={[disc('a', '2026-04-10T09:00:00Z')]} month="2026-04" />);
    expect(screen.getByTestId('marker-2026-04-10')).toBeTruthy();
    expect(screen.queryByTestId('marker-2026-04-11')).toBeNull();
  });

  it('マーカー日の aria-label に件数を含める', () => {
    render(
      <CalendarView
        discoveries={[disc('a', '2026-04-10T09:00:00Z'), disc('b', '2026-04-10T11:00:00Z')]}
        month="2026-04"
      />,
    );
    expect(screen.getByRole('button', { name: '2026-04-10 (2件の発見)' })).toBeTruthy();
  });

  it('日を選択するとその日の discovery 一覧を表示する', () => {
    render(
      <CalendarView
        discoveries={[
          disc('a', '2026-04-10T09:00:00Z', { commonName: 'タンポポ' }),
          disc('b', '2026-04-11T09:00:00Z', { commonName: 'スミレ' }),
        ]}
        month="2026-04"
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: /2026-04-10/ }));
    const headings = screen.getAllByRole('heading', { level: 3 });
    expect(headings.some((h) => h.textContent === '2026-04-10')).toBe(true);
    expect(screen.getByText('タンポポ')).toBeTruthy();
    expect(screen.queryByText('スミレ')).toBeNull();
  });

  it('発見のない日を選択すると「この日の発見はありません」', () => {
    render(<CalendarView discoveries={[disc('a', '2026-04-10T09:00:00Z')]} month="2026-04" />);
    fireEvent.click(screen.getByRole('button', { name: '2026-04-15' }));
    expect(screen.getByText('この日の発見はありません')).toBeTruthy();
  });

  it('選択日の項目押下で onSelect を発火する', () => {
    const onSelect = vi.fn();
    const d = disc('a', '2026-04-10T09:00:00Z', { commonName: 'タンポポ' });
    render(<CalendarView discoveries={[d]} month="2026-04" onSelect={onSelect} />);
    fireEvent.click(screen.getByRole('button', { name: /2026-04-10/ }));
    fireEvent.click(screen.getByRole('button', { name: 'タンポポ' }));
    expect(onSelect).toHaveBeenCalledWith(d);
  });

  it('次の月 / 前の月ボタンで月を移動する', () => {
    render(<CalendarView discoveries={[]} month="2026-04" />);
    fireEvent.click(screen.getByRole('button', { name: '次の月' }));
    expect(screen.getByText('2026-05')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: '前の月' }));
    fireEvent.click(screen.getByRole('button', { name: '前の月' }));
    expect(screen.getByText('2026-03')).toBeTruthy();
  });

  it('month 未指定なら最新 discovery の月を初期表示する', () => {
    render(
      <CalendarView
        discoveries={[disc('a', '2026-02-10T09:00:00Z'), disc('b', '2026-06-20T09:00:00Z')]}
      />,
    );
    expect(screen.getByText('2026-06')).toBeTruthy();
  });

  it('指定月外の日 (前月分) はマーカーを出さない', () => {
    render(
      <CalendarView
        discoveries={[disc('a', '2026-03-31T09:00:00Z'), disc('b', '2026-04-01T09:00:00Z')]}
        month="2026-04"
      />,
    );
    expect(within(screen.getByLabelText('カレンダー')).queryByTestId('marker-2026-03-31')).toBeNull();
    expect(screen.getByTestId('marker-2026-04-01')).toBeTruthy();
  });
});

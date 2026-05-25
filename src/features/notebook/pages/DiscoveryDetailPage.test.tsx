// @vitest-environment happy-dom
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { DiscoveryDetailPage } from './DiscoveryDetailPage';
import type { NotebookDiscovery } from '../types';

const base: NotebookDiscovery = {
  id: 'd1',
  commonName: 'タンポポ',
  scientificName: 'Taraxacum officinale',
  status: 'identified',
  capturedAt: '2026-05-25T02:32:00.000Z',
  season: 'spring',
  userNote: '道端に咲いていた',
  imageObjectKey: 'u1/d1/i1.webp',
};

describe('DiscoveryDetailPage (revise_001 / UC4 閲覧)', () => {
  it('UT-NB-DT01: 名前・学名・状態・メモを表示し、画像 URL を img に出す', () => {
    render(<DiscoveryDetailPage discovery={base} imageUrl="https://signed/i1" />);
    expect(screen.getByText('タンポポ')).toBeTruthy();
    expect(screen.getByText('Taraxacum officinale')).toBeTruthy();
    expect(screen.getByText('名前がわかりました')).toBeTruthy();
    expect(screen.getByText('道端に咲いていた')).toBeTruthy();
    const img = screen.getByRole('img') as HTMLImageElement;
    expect(img.src).toContain('https://signed/i1');
    expect(img.getAttribute('loading')).toBe('lazy');
  });

  it('UT-NB-DT04: commonName 無 + status=unknown → 日常語の名前 (技術用語なし)', () => {
    render(<DiscoveryDetailPage discovery={{ ...base, commonName: null, status: 'unknown' }} />);
    expect(screen.getByRole('heading').textContent).toBe('名前がわかりませんでした');
  });

  it('imageUrl 無 → プレースホルダ (img を出さない)', () => {
    render(<DiscoveryDetailPage discovery={base} imageUrl={null} />);
    expect(screen.queryByRole('img')).toBeNull();
  });

  it('UT-NB-DT03: discovery=null + loading=false → 見つかりません', () => {
    render(<DiscoveryDetailPage discovery={null} loading={false} />);
    expect(screen.getByText('見つかりませんでした。')).toBeTruthy();
  });

  it('discovery=null + loading=true → 読み込み中', () => {
    render(<DiscoveryDetailPage discovery={null} loading />);
    expect(screen.getByText('読み込み中…')).toBeTruthy();
  });

  it('onBack ボタンが押せる', () => {
    const onBack = vi.fn();
    render(<DiscoveryDetailPage discovery={base} onBack={onBack} />);
    screen.getByText('ノートへ戻る').click();
    expect(onBack).toHaveBeenCalled();
  });
});

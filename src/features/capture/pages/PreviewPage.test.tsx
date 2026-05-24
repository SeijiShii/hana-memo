// @vitest-environment happy-dom
/**
 * PreviewPage 単体テスト
 * 由来: docs/capture/001_capture_SPEC.md §1 UC1 / §2.2 / §4.1 / UC3 中断
 */
import { describe, it, expect, vi, beforeAll } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { PreviewPage } from './PreviewPage';
import { MAX_USER_NOTE } from '../note';

beforeAll(() => {
  // happy-dom 環境差異に備え createObjectURL を保証する。
  if (typeof URL.createObjectURL !== 'function') {
    URL.createObjectURL = () => 'blob:preview';
  }
});

const file = new File(['photo'], 'plant.webp', { type: 'image/webp' });

function renderPreview(opts: {
  withFile?: boolean;
  onConfirm?: (file: File, note?: string) => void | Promise<void>;
} = {}) {
  const { withFile = true, onConfirm } = opts;
  render(
    <MemoryRouter
      initialEntries={[
        { pathname: '/capture/preview', state: withFile ? { file } : null },
      ]}
    >
      <Routes>
        <Route path="/capture/preview" element={<PreviewPage onConfirm={onConfirm} />} />
        <Route path="/capture" element={<div>CAPTURE_SCREEN</div>} />
        <Route path="/notebook" element={<div>NOTEBOOK_SCREEN</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('PreviewPage', () => {
  it('File あり → プレビュー画像 + 補助メモ textarea を表示', () => {
    renderPreview();
    expect(screen.getByAltText('撮影プレビュー')).toBeTruthy();
    expect(screen.getByPlaceholderText(/気づいたこと/)).toBeTruthy();
  });

  it('補助メモは MAX_USER_NOTE で頭打ち (maxLength)', () => {
    renderPreview();
    const textarea = screen.getByPlaceholderText(/気づいたこと/) as HTMLTextAreaElement;
    const long = 'あ'.repeat(MAX_USER_NOTE + 50);
    fireEvent.change(textarea, { target: { value: long } });
    expect(textarea.value.length).toBe(MAX_USER_NOTE);
  });

  it('これでよい → onConfirm(整形済みメモ) を呼び /notebook へ遷移', async () => {
    const onConfirm = vi.fn();
    renderPreview({ onConfirm });
    const textarea = screen.getByPlaceholderText(/気づいたこと/) as HTMLTextAreaElement;
    fireEvent.change(textarea, { target: { value: '  道端のタンポポ  ' } });
    fireEvent.click(screen.getByRole('button', { name: 'これでよい' }));
    await waitFor(() => expect(screen.getByText('NOTEBOOK_SCREEN')).toBeTruthy());
    expect(onConfirm).toHaveBeenCalledOnce();
    expect(onConfirm.mock.calls[0]![0]).toBe(file);
    // sanitizeUserNote で trim 済み。
    expect(onConfirm.mock.calls[0]![1]).toBe('道端のタンポポ');
  });

  it('撮り直し → /capture へ遷移', () => {
    renderPreview();
    fireEvent.click(screen.getByRole('button', { name: '撮り直し' }));
    expect(screen.getByText('CAPTURE_SCREEN')).toBeTruthy();
  });

  it('File 無し (deep link) → /capture へ redirect', () => {
    renderPreview({ withFile: false });
    expect(screen.getByText('CAPTURE_SCREEN')).toBeTruthy();
    expect(screen.queryByAltText('撮影プレビュー')).toBeNull();
  });
});

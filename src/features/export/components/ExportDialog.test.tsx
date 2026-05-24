// @vitest-environment happy-dom
/**
 * ExportDialog 単体テスト
 * 由来: docs/export/001_export_SPEC.md §1 UC1/UC2/UC4 §4 (E-EX-004),
 *       docs/export/004_export_E2E_TEST.md (E-EX-1/3/4)
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ExportDialog } from './ExportDialog';

describe('ExportDialog', () => {
  it('open=false → 何も描画しない', () => {
    render(<ExportDialog open={false} onClose={vi.fn()} onExportCsv={vi.fn()} />);
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('フォーマット選択タブ (CSV / PDF / 画像 ZIP) を表示する', () => {
    render(<ExportDialog open onClose={vi.fn()} onExportCsv={vi.fn()} />);
    expect(screen.getByRole('button', { name: 'CSV' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'PDF' })).toBeTruthy();
    expect(screen.getByRole('button', { name: '画像 ZIP' })).toBeTruthy();
  });

  it('既定は CSV 選択 (aria-pressed)', () => {
    render(<ExportDialog open onClose={vi.fn()} onExportCsv={vi.fn()} />);
    expect(screen.getByRole('button', { name: 'CSV' }).getAttribute('aria-pressed')).toBe('true');
  });

  it('タブ押下でフォーマットを切り替える', () => {
    render(
      <ExportDialog
        open
        onClose={vi.fn()}
        onExportCsv={vi.fn()}
        onExportImageZip={vi.fn()}
        pdfUnlocked
        onExportPdf={vi.fn()}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: '画像 ZIP' }));
    expect(screen.getByRole('button', { name: '画像 ZIP' }).getAttribute('aria-pressed')).toBe(
      'true',
    );
    expect(screen.getByRole('button', { name: 'CSV' }).getAttribute('aria-pressed')).toBe('false');
  });

  it('CSV 選択 + 「書き出す」押下で onExportCsv を起動する (E-EX-1)', async () => {
    const onExportCsv = vi.fn().mockResolvedValue(undefined);
    render(<ExportDialog open onClose={vi.fn()} onExportCsv={onExportCsv} />);
    fireEvent.click(screen.getByRole('button', { name: '書き出す' }));
    await waitFor(() => expect(onExportCsv).toHaveBeenCalledOnce());
  });

  it('PDF unlock 済 + 「書き出す」で注入 PDF ジェネレータを起動する (E-EX-4)', async () => {
    const onExportPdf = vi.fn().mockResolvedValue(undefined);
    render(
      <ExportDialog
        open
        onClose={vi.fn()}
        onExportCsv={vi.fn()}
        onExportPdf={onExportPdf}
        pdfUnlocked
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'PDF' }));
    fireEvent.click(screen.getByRole('button', { name: '書き出す' }));
    await waitFor(() => expect(onExportPdf).toHaveBeenCalledOnce());
  });

  it('画像 ZIP 選択 + 「書き出す」で注入 ZIP ジェネレータを起動する (E-EX-6)', async () => {
    const onExportImageZip = vi.fn().mockResolvedValue(undefined);
    render(
      <ExportDialog open onClose={vi.fn()} onExportCsv={vi.fn()} onExportImageZip={onExportImageZip} />,
    );
    fireEvent.click(screen.getByRole('button', { name: '画像 ZIP' }));
    fireEvent.click(screen.getByRole('button', { name: '書き出す' }));
    await waitFor(() => expect(onExportImageZip).toHaveBeenCalledOnce());
  });

  it('E-EX-004: PDF 未 unlock → 「アンロックする」誘導 + onUnlock 起動 (書き出さない)', () => {
    const onExportPdf = vi.fn();
    const onUnlock = vi.fn();
    render(
      <ExportDialog
        open
        onClose={vi.fn()}
        onExportCsv={vi.fn()}
        onExportPdf={onExportPdf}
        pdfUnlocked={false}
        onUnlock={onUnlock}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'PDF' }));
    expect(screen.queryByRole('button', { name: '書き出す' })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: /アンロックする/ }));
    expect(onUnlock).toHaveBeenCalledOnce();
    expect(onExportPdf).not.toHaveBeenCalled();
  });

  it('PDF/画像 ZIP ジェネレータ未配線 → 「準備中」表示 (Milestone C 待ち)', () => {
    render(<ExportDialog open onClose={vi.fn()} onExportCsv={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: '画像 ZIP' }));
    expect(screen.getByText('準備中です')).toBeTruthy();
    expect(screen.queryByRole('button', { name: '書き出す' })).toBeNull();
  });

  it('exporting 中 → 「書き出し中…」+ ボタン disable (進捗状態)', () => {
    render(<ExportDialog open onClose={vi.fn()} onExportCsv={vi.fn()} exporting />);
    const btn = screen.getByRole('button', { name: '書き出し中…' }) as HTMLButtonElement;
    expect(btn.disabled).toBe(true);
    expect(btn.getAttribute('aria-busy')).toBe('true');
  });

  it('exporting 中はフォーマットタブも disable する', () => {
    render(<ExportDialog open onClose={vi.fn()} onExportCsv={vi.fn()} exporting />);
    expect((screen.getByRole('button', { name: 'PDF' }) as HTMLButtonElement).disabled).toBe(true);
  });

  it('error props ありでエラーフィードバックを表示する', () => {
    render(
      <ExportDialog open onClose={vi.fn()} onExportCsv={vi.fn()} error={new Error('boom')} />,
    );
    expect(screen.getByRole('alert').textContent).toContain('書き出しに失敗しました');
  });

  it('注入アクションが reject → ローカルエラーフィードバックを表示する', async () => {
    const onExportCsv = vi.fn().mockRejectedValue(new Error('fetch failed'));
    render(<ExportDialog open onClose={vi.fn()} onExportCsv={onExportCsv} />);
    fireEvent.click(screen.getByRole('button', { name: '書き出す' }));
    await waitFor(() => expect(screen.getByRole('alert')).toBeTruthy());
  });

  it('「閉じる」押下で onClose を起動する', () => {
    const onClose = vi.fn();
    render(<ExportDialog open onClose={onClose} onExportCsv={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: '閉じる' }));
    expect(onClose).toHaveBeenCalledOnce();
  });
});

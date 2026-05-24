// @vitest-environment happy-dom
/**
 * DeleteAccountDialog 単体テスト
 * 由来: docs/account/001_account_SPEC.md §1 UC5 §4 (E-AC-005),
 *       docs/account/004_account_E2E_TEST.md (E-AC-5)
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { DeleteAccountDialog } from './DeleteAccountDialog';

describe('DeleteAccountDialog', () => {
  it('open=false → 何も描画しない', () => {
    render(<DeleteAccountDialog open={false} onDeleteAccount={vi.fn()} />);
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('open=true → step1 で削除予定件数 + 不可逆の警告を表示する (UC5)', () => {
    render(
      <DeleteAccountDialog open discoveryCount={12} imageCount={34} onDeleteAccount={vi.fn()} />,
    );
    expect(screen.getByRole('dialog', { name: 'アカウント削除' })).toBeTruthy();
    expect(screen.getByText(/発見 12 件、画像 34 枚/)).toBeTruthy();
    expect(screen.getByText(/取り消せません/)).toBeTruthy();
    // step1 では確定ボタンも理由入力も出ない。
    expect(screen.queryByLabelText('削除理由')).toBeNull();
    expect(screen.queryByRole('button', { name: '確認しました、削除します' })).toBeNull();
  });

  it('ワンクリックでは削除しない: step1 の「削除を予約」では onDeleteAccount を起動しない', () => {
    const onDeleteAccount = vi.fn();
    render(<DeleteAccountDialog open onDeleteAccount={onDeleteAccount} />);
    fireEvent.click(screen.getByRole('button', { name: '削除を予約' }));
    expect(onDeleteAccount).not.toHaveBeenCalled();
    // step2 へ進む。
    expect(screen.getByLabelText('削除理由')).toBeTruthy();
  });

  it('明示同意なしでは確定ボタンが disabled で onDeleteAccount を起動しない', () => {
    const onDeleteAccount = vi.fn();
    render(<DeleteAccountDialog open onDeleteAccount={onDeleteAccount} />);
    fireEvent.click(screen.getByRole('button', { name: '削除を予約' }));
    const confirm = screen.getByRole('button', {
      name: '確認しました、削除します',
    }) as HTMLButtonElement;
    expect(confirm.disabled).toBe(true);
    fireEvent.click(confirm);
    expect(onDeleteAccount).not.toHaveBeenCalled();
  });

  it('二段階 + 明示同意の後に onDeleteAccount を整形済み理由で起動する (E-AC-5)', async () => {
    const onDeleteAccount = vi.fn<(reason: string | null) => void>();
    render(<DeleteAccountDialog open onDeleteAccount={onDeleteAccount} />);
    fireEvent.click(screen.getByRole('button', { name: '削除を予約' }));
    fireEvent.change(screen.getByLabelText('削除理由'), { target: { value: '  テスト  ' } });
    fireEvent.click(screen.getByLabelText('削除に同意する'));
    fireEvent.click(screen.getByRole('button', { name: '確認しました、削除します' }));
    // sanitizeDeletionReason で trim される。
    await waitFor(() => expect(onDeleteAccount).toHaveBeenCalledWith('テスト'));
  });

  it('理由未入力でも同意さえあれば null で起動する', async () => {
    const onDeleteAccount = vi.fn<(reason: string | null) => void>();
    render(<DeleteAccountDialog open onDeleteAccount={onDeleteAccount} />);
    fireEvent.click(screen.getByRole('button', { name: '削除を予約' }));
    fireEvent.click(screen.getByLabelText('削除に同意する'));
    fireEvent.click(screen.getByRole('button', { name: '確認しました、削除します' }));
    await waitFor(() => expect(onDeleteAccount).toHaveBeenCalledWith(null));
  });

  it('キャンセル → onClose 呼出', () => {
    const onClose = vi.fn();
    render(<DeleteAccountDialog open onDeleteAccount={vi.fn()} onClose={onClose} />);
    fireEvent.click(screen.getByRole('button', { name: 'キャンセル' }));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('pending → 「処理中…」+ 確定ボタン disable', () => {
    render(<DeleteAccountDialog open pending onDeleteAccount={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: '削除を予約' }));
    fireEvent.click(screen.getByLabelText('削除に同意する'));
    const btn = screen.getByRole('button', { name: '処理中…' }) as HTMLButtonElement;
    expect(btn.disabled).toBe(true);
    expect(btn.getAttribute('aria-busy')).toBe('true');
  });

  it('E-AC-005: error → 削除失敗フィードバックを表示する', () => {
    render(<DeleteAccountDialog open error={new Error('rpc down')} onDeleteAccount={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: '削除を予約' }));
    expect(screen.getByRole('alert').textContent).toContain('削除の予約に失敗しました');
  });

  it('注入 onDeleteAccount が reject → ローカルエラーフィードバックを表示する', async () => {
    const onDeleteAccount = vi.fn().mockRejectedValue(new Error('network'));
    render(<DeleteAccountDialog open onDeleteAccount={onDeleteAccount} />);
    fireEvent.click(screen.getByRole('button', { name: '削除を予約' }));
    fireEvent.click(screen.getByLabelText('削除に同意する'));
    fireEvent.click(screen.getByRole('button', { name: '確認しました、削除します' }));
    await waitFor(() =>
      expect(screen.getByRole('alert').textContent).toContain('削除の予約に失敗しました'),
    );
  });
});

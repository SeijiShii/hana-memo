// @vitest-environment happy-dom
/**
 * BillingPage 単体テスト
 * 由来: docs/billing/001_billing_SPEC.md §1 UC1/UC2 §4 (E-BL-001/002/007),
 *       docs/billing/004_billing_E2E_TEST.md (E-BL-1/2/3/4)
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BillingPage } from './BillingPage';
import type { BillingStatus, CheckoutInput } from '../api';

function status(over: Partial<BillingStatus> = {}): BillingStatus {
  return { aiCreditsRemaining: 0, pdfUnlocked: false, ...over };
}

describe('BillingPage', () => {
  it('ステータス (残クレジット / PDF unlock) を表示する (UC4)', () => {
    render(<BillingPage status={status({ aiCreditsRemaining: 40 })} onCheckout={vi.fn()} />);
    expect(screen.getByText(/残 40 回/)).toBeTruthy();
    expect(screen.getByText(/未アンロック/)).toBeTruthy();
  });

  it('購入種別タブ (AI 識別クレジット / PDF アンロック) を表示する', () => {
    render(<BillingPage status={status()} onCheckout={vi.fn()} />);
    expect(screen.getByRole('button', { name: 'AI 識別クレジット' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'PDF アンロック' })).toBeTruthy();
  });

  it('既定は AI 識別クレジットタブ (aria-pressed) + PWYW セレクタ非表示', () => {
    render(<BillingPage status={status()} onCheckout={vi.fn()} />);
    expect(
      screen.getByRole('button', { name: 'AI 識別クレジット' }).getAttribute('aria-pressed'),
    ).toBe('true');
    expect(screen.getByLabelText('数量')).toBeTruthy();
    expect(screen.queryByLabelText('カスタム金額 (円)')).toBeNull();
  });

  it('E-BL-1: 「購入する」押下で onCheckout に ai_credits + 数量を渡す (実 redirect しない)', async () => {
    const onCheckout = vi.fn<(i: CheckoutInput) => void>();
    render(<BillingPage status={status()} onCheckout={onCheckout} />);
    fireEvent.click(screen.getByRole('button', { name: '購入する' }));
    await waitFor(() =>
      expect(onCheckout).toHaveBeenCalledWith({ type: 'ai_credits', quantity: 1 }),
    );
  });

  it('AI クレジットは ¥100 = 10 回追加 を表示 (revise_001: 1 回上限 ¥100)', () => {
    render(<BillingPage status={status()} onCheckout={vi.fn()} />);
    expect(screen.getByText(/合計 ¥100（10 回追加）/)).toBeTruthy();
  });

  it('AI 数量が範囲外 (11) → エラー + 購入不可', () => {
    render(<BillingPage status={status()} onCheckout={vi.fn()} />);
    fireEvent.change(screen.getByLabelText('数量'), { target: { value: '11' } });
    expect(screen.getByRole('alert').textContent).toContain('数量');
    expect((screen.getByRole('button', { name: '購入する' }) as HTMLButtonElement).disabled).toBe(
      true,
    );
  });

  it('E-BL-2: PDF タブ → PWYW セレクタ表示 + 「購入する」で pdf_unlock + 金額を渡す', async () => {
    const onCheckout = vi.fn<(i: CheckoutInput) => void>();
    render(<BillingPage status={status()} onCheckout={onCheckout} />);
    fireEvent.click(screen.getByRole('button', { name: 'PDF アンロック' }));
    expect(screen.getByLabelText('カスタム金額 (円)')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: '購入する' }));
    await waitFor(() =>
      expect(onCheckout).toHaveBeenCalledWith({ type: 'pdf_unlock', amountJpy: 500 }),
    );
  });

  it('E-BL-3: PDF タブで最低額未満 (¥50) → 購入不可 + onCheckout 未起動', async () => {
    const onCheckout = vi.fn();
    render(<BillingPage status={status()} onCheckout={onCheckout} />);
    fireEvent.click(screen.getByRole('button', { name: 'PDF アンロック' }));
    fireEvent.change(screen.getByLabelText('カスタム金額 (円)'), { target: { value: '50' } });
    const buy = screen.getByRole('button', { name: '購入する' }) as HTMLButtonElement;
    expect(buy.disabled).toBe(true);
    fireEvent.click(buy);
    expect(onCheckout).not.toHaveBeenCalled();
  });

  it('E-BL-007: PDF が unlock 済 → 二重課金させず「アンロック済み」表示 + 購入不可', () => {
    render(<BillingPage status={status({ pdfUnlocked: true })} onCheckout={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: 'PDF アンロック' }));
    expect(screen.getByText('すでにアンロック済みです')).toBeTruthy();
    expect((screen.getByRole('button', { name: '購入する' }) as HTMLButtonElement).disabled).toBe(
      true,
    );
  });

  it('E-BL-002: 匿名 user (isLinked=false) で購入 → OAuth ゲート表示 + onCheckout 未起動', () => {
    const onCheckout = vi.fn();
    render(<BillingPage status={status()} isLinked={false} onCheckout={onCheckout} />);
    expect(screen.queryByRole('dialog')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: '購入する' }));
    expect(screen.getByRole('dialog', { name: 'アカウント連携が必要です' })).toBeTruthy();
    expect(onCheckout).not.toHaveBeenCalled();
  });

  it('E-BL-002: OAuth ゲートの「連携する」で onLink を起動する', () => {
    const onLink = vi.fn();
    render(<BillingPage status={status()} isLinked={false} onLink={onLink} onCheckout={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: '購入する' }));
    fireEvent.click(screen.getByRole('button', { name: '連携する' }));
    expect(onLink).toHaveBeenCalledOnce();
  });

  it('statusLoading かつ未取得 → ローディング表示', () => {
    render(<BillingPage status={null} statusLoading onCheckout={vi.fn()} />);
    expect(screen.getByText('読み込み中…')).toBeTruthy();
  });

  it('statusError → ステータス取得エラー表示', () => {
    render(<BillingPage status={null} statusError={new Error('boom')} onCheckout={vi.fn()} />);
    expect(screen.getByRole('alert').textContent).toContain('ステータスの取得に失敗しました');
  });

  it('checkoutPending → 「処理中…」+ 購入ボタン disable', () => {
    render(<BillingPage status={status()} checkoutPending onCheckout={vi.fn()} />);
    const btn = screen.getByRole('button', { name: '処理中…' }) as HTMLButtonElement;
    expect(btn.disabled).toBe(true);
    expect(btn.getAttribute('aria-busy')).toBe('true');
  });

  it('E-BL-001: checkoutError → 決済失敗フィードバック表示', () => {
    render(
      <BillingPage
        status={status()}
        checkoutError={new Error('stripe down')}
        onCheckout={vi.fn()}
      />,
    );
    expect(screen.getByRole('alert').textContent).toContain('決済システムが応答しません');
  });

  it('注入 onCheckout が reject → ローカルエラーフィードバックを表示する', async () => {
    const onCheckout = vi.fn().mockRejectedValue(new Error('network'));
    render(<BillingPage status={status()} onCheckout={onCheckout} />);
    fireEvent.click(screen.getByRole('button', { name: '購入する' }));
    await waitFor(() =>
      expect(screen.getByRole('alert').textContent).toContain('決済システムが応答しません'),
    );
  });

  it('checkoutComplete → 受領確認メッセージ (success_url 戻り)', () => {
    render(<BillingPage status={status()} checkoutComplete onCheckout={vi.fn()} />);
    expect(screen.getByRole('status').textContent).toContain('購入が完了しました');
  });
});

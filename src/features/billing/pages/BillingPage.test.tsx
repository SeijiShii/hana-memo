// @vitest-environment happy-dom
/**
 * BillingPage 単体テスト
 * 由来: docs/billing/001_billing_SPEC.md §1 UC1/UC2 §4 (E-BL-001/007),
 *       docs/billing/004_billing_E2E_TEST.md (E-BL-1/2/3/4)
 * revise_001: 匿名でも購入可。OAuth リンク必須ゲート (旧 E-BL-002) は撤廃したためテスト削除。
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BillingPage } from './BillingPage';
import type { BillingStatus, CheckoutInput } from '../api';

function status(over: Partial<BillingStatus> = {}): BillingStatus {
  return { aiCreditsRemaining: 0, ...over };
}

describe('BillingPage', () => {
  it('ステータス (残クレジット) を表示する (UC4)', () => {
    render(<BillingPage status={status({ aiCreditsRemaining: 40 })} onCheckout={vi.fn()} />);
    expect(screen.getByText(/残 40 回/)).toBeTruthy();
  });

  it('AI 識別クレジット購入の数量入力を表示する', () => {
    render(<BillingPage status={status()} onCheckout={vi.fn()} />);
    expect(screen.getByLabelText('数量')).toBeTruthy();
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

  it('revise_001: OAuth リンクゲートなしで購入が直接進む (連携モーダルを出さない)', async () => {
    const onCheckout = vi.fn<(i: CheckoutInput) => void>();
    render(<BillingPage status={status()} onCheckout={onCheckout} />);
    fireEvent.click(screen.getByRole('button', { name: '購入する' }));
    expect(screen.queryByRole('dialog')).toBeNull();
    await waitFor(() =>
      expect(onCheckout).toHaveBeenCalledWith({ type: 'ai_credits', quantity: 1 }),
    );
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

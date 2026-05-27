// @vitest-environment happy-dom
/**
 * BillingPage 単体テスト
 * 由来: docs/billing/001_billing_SPEC.md §1 UC1 §4 (E-BL-001/007),
 *       docs/billing/revise_002_20260527_remove-qty-input/003_REVISE_UNIT_TEST.md
 * revise_001: 匿名でも購入可。OAuth リンク必須ゲート (旧 E-BL-002) は撤廃。
 * revise_002: AI_QTY_MAX=1 (単発) のため数量入力 UI を撤去。固定価格 + 単一ボタン、quantity=1 固定送信。
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BillingPage } from './BillingPage';
import type { BillingStatus, CheckoutInput } from '../api';

const BUY = '¥100 で購入する';

function status(over: Partial<BillingStatus> = {}): BillingStatus {
  return { aiCreditsRemaining: 0, ...over };
}

describe('BillingPage', () => {
  it('ステータス (残クレジット) を表示する (UC4)', () => {
    render(<BillingPage status={status({ aiCreditsRemaining: 40 })} onCheckout={vi.fn()} />);
    expect(screen.getByText(/残 40 回/)).toBeTruthy();
  });

  it('UT-R2-02: 固定価格 (¥100 で AI識別10回) を表示し、数量入力は無い', () => {
    render(<BillingPage status={status()} onCheckout={vi.fn()} />);
    expect(screen.getByText(/¥100 で AI 識別が 10 回ふえます/)).toBeTruthy();
    // revise_002: 数量入力 (選択肢ゼロ) は撤去済
    expect(screen.queryByLabelText('数量')).toBeNull();
    expect(screen.queryByText(/合計/)).toBeNull();
  });

  it('UT-R2-01: 「¥100 で購入する」押下で onCheckout に ai_credits + quantity:1 を渡す (実 redirect しない)', async () => {
    const onCheckout = vi.fn<(i: CheckoutInput) => void>();
    render(<BillingPage status={status()} onCheckout={onCheckout} />);
    fireEvent.click(screen.getByRole('button', { name: BUY }));
    await waitFor(() =>
      expect(onCheckout).toHaveBeenCalledWith({ type: 'ai_credits', quantity: 1 }),
    );
  });

  it('revise_001: OAuth リンクゲートなしで購入が直接進む (連携モーダルを出さない)', async () => {
    const onCheckout = vi.fn<(i: CheckoutInput) => void>();
    render(<BillingPage status={status()} onCheckout={onCheckout} />);
    fireEvent.click(screen.getByRole('button', { name: BUY }));
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
    fireEvent.click(screen.getByRole('button', { name: BUY }));
    await waitFor(() =>
      expect(screen.getByRole('alert').textContent).toContain('決済システムが応答しません'),
    );
  });

  it('checkoutComplete → 受領確認メッセージ (success_url 戻り)', () => {
    render(<BillingPage status={status()} checkoutComplete onCheckout={vi.fn()} />);
    expect(screen.getByRole('status').textContent).toContain('購入が完了しました');
  });
});

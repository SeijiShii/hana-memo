// @vitest-environment happy-dom
/**
 * PwywSelector 単体テスト
 * 由来: docs/billing/001_billing_SPEC.md §1 UC2 / §4.1 (PWYW 100-10000),
 *       docs/billing/004_billing_E2E_TEST.md E-BL-3 (最小金額バリデーション)
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { PwywSelector, formatJpy, PWYW_SUGGESTED_JPY } from './PwywSelector';
import { PWYW_MIN_JPY, PWYW_PRESET_JPY } from '../pricing';

describe('PwywSelector', () => {
  it('推奨金額チップ (¥100 / ¥500 / ¥1000) を表示する', () => {
    render(<PwywSelector value={PWYW_PRESET_JPY} onChange={vi.fn()} />);
    for (const amount of PWYW_SUGGESTED_JPY) {
      expect(screen.getByRole('button', { name: formatJpy(amount) })).toBeTruthy();
    }
  });

  it('現在値に一致する推奨チップを aria-pressed にする', () => {
    render(<PwywSelector value={PWYW_PRESET_JPY} onChange={vi.fn()} />);
    expect(
      screen.getByRole('button', { name: formatJpy(PWYW_PRESET_JPY) }).getAttribute('aria-pressed'),
    ).toBe('true');
  });

  it('チップ押下で onChange に金額を渡す', () => {
    const onChange = vi.fn();
    render(<PwywSelector value={PWYW_PRESET_JPY} onChange={onChange} />);
    fireEvent.click(screen.getByRole('button', { name: formatJpy(1000) }));
    expect(onChange).toHaveBeenCalledWith(1000);
  });

  it('カスタム入力で onChange に数値を渡す', () => {
    const onChange = vi.fn();
    render(<PwywSelector value={PWYW_PRESET_JPY} onChange={onChange} />);
    fireEvent.change(screen.getByLabelText('カスタム金額 (円)'), { target: { value: '777' } });
    expect(onChange).toHaveBeenCalledWith(777);
  });

  it('E-BL-3: 最低額未満 (¥50) → 範囲エラーを表示する', () => {
    render(<PwywSelector value={50} onChange={vi.fn()} onValidChange={vi.fn()} />);
    expect(screen.getByRole('alert').textContent).toContain('最低');
  });

  it('E-BL-3: 有効値から最低額未満 (¥50) へ入力変更 → onValidChange(false)', () => {
    const onValidChange = vi.fn();
    render(<PwywSelector value={500} onChange={vi.fn()} onValidChange={onValidChange} />);
    fireEvent.change(screen.getByLabelText('カスタム金額 (円)'), { target: { value: '50' } });
    expect(onValidChange).toHaveBeenLastCalledWith(false);
  });

  it('最低額 (¥100) ちょうどは有効 (エラー非表示)', () => {
    render(<PwywSelector value={PWYW_MIN_JPY} onChange={vi.fn()} />);
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('範囲内の値で onValidChange(true) を伝える', () => {
    const onValidChange = vi.fn();
    render(
      <PwywSelector value={PWYW_PRESET_JPY} onChange={vi.fn()} onValidChange={onValidChange} />,
    );
    fireEvent.click(screen.getByRole('button', { name: formatJpy(1000) }));
    expect(onValidChange).toHaveBeenLastCalledWith(true);
  });

  it('空入力は 0 として扱い範囲エラーを出す', () => {
    const onChange = vi.fn();
    render(<PwywSelector value={PWYW_PRESET_JPY} onChange={onChange} />);
    fireEvent.change(screen.getByLabelText('カスタム金額 (円)'), { target: { value: '' } });
    expect(onChange).toHaveBeenCalledWith(0);
  });

  it('上限超過 (¥20000) → 範囲エラー', () => {
    render(<PwywSelector value={20000} onChange={vi.fn()} />);
    expect(screen.getByRole('alert').textContent).toContain('最大');
  });
});

describe('formatJpy', () => {
  it('円表記 + 桁区切りに整形する', () => {
    expect(formatJpy(500)).toBe('¥500');
    expect(formatJpy(10000)).toBe('¥10,000');
  });
});

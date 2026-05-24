// @vitest-environment happy-dom
/**
 * ConsentCheckbox 単体テスト
 * 由来: docs/legal/001_legal_SPEC.md §2.2, 002_legal_PLAN.md §1.1
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ConsentCheckbox } from './ConsentCheckbox';
import { LEGAL_DOC_META } from '../docs';

function renderBox(props: Partial<Parameters<typeof ConsentCheckbox>[0]> = {}) {
  return render(
    <MemoryRouter>
      <ConsentCheckbox docType="privacy_policy" checked={false} onChange={vi.fn()} {...props} />
    </MemoryRouter>,
  );
}

describe('ConsentCheckbox', () => {
  it('doc_type のラベルと「全文を見る」リンクを表示する', () => {
    renderBox({ docType: 'privacy_policy' });
    expect(screen.getByText(LEGAL_DOC_META.privacy_policy.label)).toBeTruthy();
    const link = screen.getByRole('link', { name: '全文を見る' });
    expect(link.getAttribute('href')).toBe('/legal/privacy');
  });

  it('checked=true → checkbox が ON', () => {
    renderBox({ checked: true });
    expect((screen.getByRole('checkbox') as HTMLInputElement).checked).toBe(true);
  });

  it('チェック切替で onChange(true) を呼ぶ', () => {
    const onChange = vi.fn();
    renderBox({ checked: false, onChange });
    fireEvent.click(screen.getByRole('checkbox'));
    expect(onChange).toHaveBeenCalledWith(true);
  });

  it('disabled → checkbox が無効', () => {
    renderBox({ disabled: true });
    expect((screen.getByRole('checkbox') as HTMLInputElement).disabled).toBe(true);
  });

  it('label が checkbox に関連付けられている (a11y)', () => {
    renderBox({ docType: 'terms_of_service' });
    // getByLabelText で checkbox が取得できる = label[for] と input[id] が一致
    const labelHit = screen.getByRole('checkbox');
    expect(labelHit.id).toBe('consent-terms_of_service');
  });
});

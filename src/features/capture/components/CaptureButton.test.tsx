// @vitest-environment happy-dom
/**
 * CaptureButton 単体テスト
 * 由来: docs/capture/001_capture_SPEC.md §1 UC1 代替フロー / §4.2 E-CA-004/005
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { CaptureButton } from './CaptureButton';

function renderButton(props: Partial<Parameters<typeof CaptureButton>[0]> = {}) {
  const onCapture = vi.fn();
  render(
    <MemoryRouter>
      <CaptureButton quotaRemaining={5} onCapture={onCapture} {...props} />
    </MemoryRouter>,
  );
  return { onCapture };
}

describe('CaptureButton', () => {
  it('quota>0 → CameraCapture を表示し、撮影で onCapture 発火', () => {
    const { onCapture } = renderButton({ quotaRemaining: 3 });
    const input = screen.getByLabelText('植物を撮影 / 画像を選択') as HTMLInputElement;
    expect(input).toBeTruthy();
    const file = new File(['x'], 'plant.webp', { type: 'image/webp' });
    fireEvent.change(input, { target: { files: [file] } });
    expect(onCapture).toHaveBeenCalledOnce();
    expect(onCapture.mock.calls[0]![0]).toBe(file);
    // 撮影可能時は modal を出さない。
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('quota 0 → 撮影せず QuotaModal(reason=quota) を開く', () => {
    const { onCapture } = renderButton({ quotaRemaining: 0 });
    // CameraCapture の input は出ない。
    expect(screen.queryByLabelText('植物を撮影 / 画像を選択')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: '撮影する' }));
    expect(onCapture).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: '課金画面へ' })).toBeTruthy();
  });

  it('linkRequired → QuotaModal(reason=link_required) を開く', () => {
    renderButton({ quotaRemaining: 5, linkRequired: true });
    fireEvent.click(screen.getByRole('button', { name: '撮影する' }));
    expect(screen.getByRole('button', { name: 'アカウント連携へ' })).toBeTruthy();
  });

  it('disabled で撮影 input を無効化', () => {
    renderButton({ quotaRemaining: 3, disabled: true });
    const input = screen.getByLabelText('植物を撮影 / 画像を選択') as HTMLInputElement;
    expect(input.disabled).toBe(true);
  });
});

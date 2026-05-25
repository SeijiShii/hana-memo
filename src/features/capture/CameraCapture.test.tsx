// @vitest-environment happy-dom
/**
 * CameraCapture 単体テスト
 * 由来: docs/capture/003_capture_UNIT_TEST.md §1.8 (UT-CA-E01)
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { CameraCapture } from './CameraCapture';

afterEach(() => {
  // navigator.mediaDevices を元に戻す
  vi.unstubAllGlobals();
});

describe('CameraCapture', () => {
  it('UT-CA-E01: 画像選択 → onCapture(file) 発火', () => {
    const onCapture = vi.fn();
    render(<CameraCapture onCapture={onCapture} />);
    const input = screen.getByLabelText('植物を撮影 / 画像を選択') as HTMLInputElement;
    const file = new File(['x'], 'plant.webp', { type: 'image/webp' });
    fireEvent.change(input, { target: { files: [file] } });
    expect(onCapture).toHaveBeenCalledOnce();
    expect(onCapture.mock.calls[0]![0]).toBe(file);
  });

  it('UT-CA-E01: mediaDevices 非対応 → フォルダ選択 fallback メッセージ', () => {
    vi.stubGlobal('navigator', {});
    render(<CameraCapture onCapture={vi.fn()} />);
    expect(screen.getByText(/カメラが利用できない端末/)).toBeTruthy();
  });

  it('disabled で input 無効化', () => {
    render(<CameraCapture onCapture={vi.fn()} disabled />);
    const input = screen.getByLabelText('植物を撮影 / 画像を選択') as HTMLInputElement;
    expect(input.disabled).toBe(true);
  });
});

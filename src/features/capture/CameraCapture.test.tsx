// @vitest-environment happy-dom
/**
 * CameraCapture 単体テスト
 * 由来: docs/capture/003_capture_UNIT_TEST.md §1.8 (UT-CA-E01) + fix_001 (mobile OOM → inline camera)
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { CameraCapture } from './CameraCapture';

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('CameraCapture', () => {
  it('UT-CA-E01: ファイル選択 → onCapture(file) 発火 (fallback path)', () => {
    const onCapture = vi.fn();
    render(<CameraCapture onCapture={onCapture} />);
    const input = screen.getByLabelText('植物を撮影 / 画像を選択') as HTMLInputElement;
    const file = new File(['x'], 'plant.webp', { type: 'image/webp' });
    fireEvent.change(input, { target: { files: [file] } });
    expect(onCapture).toHaveBeenCalledOnce();
    expect(onCapture.mock.calls[0]![0]).toBe(file);
  });

  it('mediaDevices 非対応 → 「写真を選ぶ」+ fallback メッセージ', () => {
    vi.stubGlobal('navigator', {});
    render(<CameraCapture onCapture={vi.fn()} />);
    expect(screen.getByText(/カメラが利用できない端末/)).toBeTruthy();
    // インラインカメラ起動ボタンは出ない
    expect(screen.queryByLabelText('カメラを起動して撮影')).toBeNull();
  });

  it('disabled で file input 無効化', () => {
    render(<CameraCapture onCapture={vi.fn()} disabled />);
    const input = screen.getByLabelText('植物を撮影 / 画像を選択') as HTMLInputElement;
    expect(input.disabled).toBe(true);
  });

  it('インラインカメラ対応端末: 「撮影する」で getUserMedia 起動 → プレビュー表示 (input-file 不使用)', async () => {
    const stop = vi.fn();
    const getUserMedia = vi.fn().mockResolvedValue({ getTracks: () => [{ stop }] });
    vi.stubGlobal('navigator', { mediaDevices: { getUserMedia } });
    render(<CameraCapture onCapture={vi.fn()} />);

    fireEvent.click(screen.getByLabelText('カメラを起動して撮影'));

    await waitFor(() => expect(getUserMedia).toHaveBeenCalledOnce());
    // environment 向きを要求 (背面カメラ)
    expect(getUserMedia.mock.calls[0]![0]).toMatchObject({ video: { facingMode: { ideal: 'environment' } } });
    // ページ内プレビュー (アプリ切り替えなし = OOM 回避)
    await waitFor(() => expect(screen.getByLabelText('カメラプレビュー')).toBeTruthy());
  });

  it('インラインカメラ: 閉じるでトラック停止 (リーク防止)', async () => {
    const stop = vi.fn();
    const getUserMedia = vi.fn().mockResolvedValue({ getTracks: () => [{ stop }] });
    vi.stubGlobal('navigator', { mediaDevices: { getUserMedia } });
    render(<CameraCapture onCapture={vi.fn()} />);

    fireEvent.click(screen.getByLabelText('カメラを起動して撮影'));
    await waitFor(() => expect(screen.getByLabelText('カメラを閉じる')).toBeTruthy());
    fireEvent.click(screen.getByLabelText('カメラを閉じる'));
    expect(stop).toHaveBeenCalled();
  });

  it('getUserMedia 失敗 → エラー文言 + file 選択 fallback', async () => {
    const getUserMedia = vi.fn().mockRejectedValue(new DOMException('denied', 'NotAllowedError'));
    vi.stubGlobal('navigator', { mediaDevices: { getUserMedia } });
    render(<CameraCapture onCapture={vi.fn()} />);

    fireEvent.click(screen.getByLabelText('カメラを起動して撮影'));
    await waitFor(() => expect(screen.getByText(/カメラを起動できませんでした/)).toBeTruthy());
    // fallback の file input は残る
    expect(screen.getByLabelText('植物を撮影 / 画像を選択')).toBeTruthy();
  });
});

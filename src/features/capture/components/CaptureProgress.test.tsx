// @vitest-environment happy-dom
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { CaptureProgress, OBSERVATION_MESSAGES } from './CaptureProgress';

afterEach(() => vi.useRealTimers());

describe('CaptureProgress (O45 進捗オーバーレイ)', () => {
  it('段階ごとにブランド文言の見出しを出す (技術用語を避ける)', () => {
    const { rerender } = render(<CaptureProgress stage="preparing" />);
    expect(screen.getByText('写真を整えています')).toBeTruthy();
    rerender(<CaptureProgress stage="uploading" />);
    expect(screen.getByText('写真を送っています')).toBeTruthy();
    rerender(<CaptureProgress stage="identifying" />);
    expect(screen.getByText('葉や花のかたちを観察しています')).toBeTruthy();
  });

  it('role=status / aria-live で待機を読み上げ可能にする', () => {
    render(<CaptureProgress stage="uploading" />);
    const status = screen.getByRole('status');
    expect(status.getAttribute('aria-live')).toBe('polite');
  });

  it('identifying のとき観察文言を一定間隔でローテーションする', () => {
    vi.useFakeTimers();
    render(<CaptureProgress stage="identifying" />);
    expect(screen.getByText(OBSERVATION_MESSAGES[0]!)).toBeTruthy();
    act(() => {
      vi.advanceTimersByTime(2000);
    });
    expect(screen.getByText(OBSERVATION_MESSAGES[1]!)).toBeTruthy();
  });

  it('identifying 以外では観察文言を出さない (uploading)', () => {
    render(<CaptureProgress stage="uploading" />);
    expect(screen.queryByText(OBSERVATION_MESSAGES[0]!)).toBeNull();
  });
});

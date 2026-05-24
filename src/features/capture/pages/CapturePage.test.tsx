// @vitest-environment happy-dom
/**
 * CapturePage 単体テスト
 * 由来: docs/capture/001_capture_SPEC.md §1 UC1 / §4.1 ai_consent_revoked
 */
import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter, Routes, Route, useLocation } from 'react-router-dom';
import { CapturePage } from './CapturePage';

/** プレビュー遷移後に router state.file を表示するプローブ。 */
function PreviewProbe() {
  const location = useLocation();
  const file = (location.state as { file?: File } | null)?.file ?? null;
  return <div>PREVIEW:{file ? file.name : 'NO_FILE'}</div>;
}

function renderPage(props: Partial<Parameters<typeof CapturePage>[0]> = {}) {
  render(
    <MemoryRouter initialEntries={['/capture']}>
      <Routes>
        <Route path="/capture" element={<CapturePage {...props} />} />
        <Route path="/capture/preview" element={<PreviewProbe />} />
        <Route path="/settings" element={<div>SETTINGS_SCREEN</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('CapturePage', () => {
  it('AI 同意 OK → 撮影ボタン (CameraCapture) を表示', () => {
    renderPage({ aiConsentActive: true, quotaRemaining: 5 });
    expect(screen.getByLabelText('植物を撮影 / 画像を選択')).toBeTruthy();
  });

  it('AI 同意 revoke → 「AI 同意が必要です」+ 設定画面リンク', () => {
    renderPage({ aiConsentActive: false });
    expect(screen.getByText('AI 同意が必要です')).toBeTruthy();
    expect(screen.queryByLabelText('植物を撮影 / 画像を選択')).toBeNull();
    fireEvent.click(screen.getByRole('link', { name: '設定画面へ' }));
    expect(screen.getByText('SETTINGS_SCREEN')).toBeTruthy();
  });

  it('撮影 → /capture/preview へ File を載せて遷移', () => {
    renderPage({ aiConsentActive: true, quotaRemaining: 5 });
    const input = screen.getByLabelText('植物を撮影 / 画像を選択') as HTMLInputElement;
    const file = new File(['x'], 'shot.webp', { type: 'image/webp' });
    fireEvent.change(input, { target: { files: [file] } });
    expect(screen.getByText('PREVIEW:shot.webp')).toBeTruthy();
  });
});

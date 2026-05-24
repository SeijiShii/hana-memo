// @vitest-environment happy-dom
/**
 * AppShell 単体テスト — 下部ナビのリンク描画 + active route ハイライト + Outlet 描画。
 * 由来: app-integration wiring (ナビシェル要件)
 */
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { AppShell } from './AppShell';

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route element={<AppShell />}>
          <Route path="/capture" element={<div>CAPTURE_SCREEN</div>} />
          <Route path="/notebook" element={<div>NOTEBOOK_SCREEN</div>} />
          <Route path="/settings" element={<div>SETTINGS_SCREEN</div>} />
        </Route>
      </Routes>
    </MemoryRouter>,
  );
}

describe('AppShell', () => {
  it('3 つのコアナビリンク (撮影 / 図鑑 / 設定) を描画する', () => {
    renderAt('/notebook');
    expect(screen.getByRole('link', { name: /撮影/ })).toBeTruthy();
    expect(screen.getByRole('link', { name: /図鑑/ })).toBeTruthy();
    expect(screen.getByRole('link', { name: /設定/ })).toBeTruthy();
  });

  it('Outlet に nested route の画面を描画する', () => {
    renderAt('/capture');
    expect(screen.getByText('CAPTURE_SCREEN')).toBeTruthy();
  });

  it('現在ルートのナビリンクを active ハイライトする (aria-current + 強調色)', () => {
    renderAt('/notebook');
    const notebookLink = screen.getByRole('link', { name: /図鑑/ });
    // react-router の NavLink は active リンクに aria-current="page" を付与する。
    expect(notebookLink.getAttribute('aria-current')).toBe('page');
    expect(notebookLink.className).toContain('text-moss-dark'); // デザイントークン (active 強調色)

    const captureLink = screen.getByRole('link', { name: /撮影/ });
    expect(captureLink.getAttribute('aria-current')).toBeNull();
    expect(captureLink.className).toContain('text-ink-faint'); // 非 active
  });
});

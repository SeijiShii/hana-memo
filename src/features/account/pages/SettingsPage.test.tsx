// @vitest-environment happy-dom
/**
 * SettingsPage 単体テスト
 * 由来: docs/account/001_account_SPEC.md §1 UC1/UC3/UC4/UC5/UC6 §4 (E-AC-004),
 *       docs/account/004_account_E2E_TEST.md (E-AC-1/3/4/5)
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { SettingsPage, type SettingsView } from './SettingsPage';

function view(over: Partial<SettingsView> = {}): SettingsView {
  return { locationPrecision: 'coarse', aiConsentRevokedAt: null, analyticsOptIn: false, ...over };
}

describe('SettingsPage', () => {
  it('E-AC-1: 各 section を表示する (アカウント / 位置情報精度 / AI 同意 / プライバシー / データ管理)', () => {
    render(<SettingsPage settings={view()} onUpdateSettings={vi.fn()} />);
    expect(screen.getByRole('region', { name: 'アカウント' })).toBeTruthy();
    expect(screen.getByRole('region', { name: '位置情報精度' })).toBeTruthy();
    expect(screen.getByRole('region', { name: 'AI 同意' })).toBeTruthy();
    expect(screen.getByRole('region', { name: 'プライバシー' })).toBeTruthy();
    expect(screen.getByRole('region', { name: 'データ管理' })).toBeTruthy();
  });

  it('現在の位置情報精度がラジオに反映される', () => {
    render(<SettingsPage settings={view({ locationPrecision: 'precise' })} onUpdateSettings={vi.fn()} />);
    expect((screen.getByRole('radio', { name: /精細/ }) as HTMLInputElement).checked).toBe(true);
    expect((screen.getByRole('radio', { name: '記録しない' }) as HTMLInputElement).checked).toBe(
      false,
    );
  });

  it('E-AC-3: 位置情報精度を変更すると onUpdateSettings に新しい値を渡す (UC3)', async () => {
    const onUpdateSettings = vi.fn();
    render(<SettingsPage settings={view()} onUpdateSettings={onUpdateSettings} />);
    fireEvent.click(screen.getByRole('radio', { name: '記録しない' }));
    await waitFor(() =>
      expect(onUpdateSettings).toHaveBeenCalledWith({ locationPrecision: 'off' }),
    );
  });

  it('AI 同意 ON のときスイッチが aria-checked=true', () => {
    render(<SettingsPage settings={view({ aiConsentRevokedAt: null })} onUpdateSettings={vi.fn()} />);
    expect(screen.getByRole('switch', { name: 'AI 利用同意' }).getAttribute('aria-checked')).toBe(
      'true',
    );
  });

  it('E-AC-4: AI 同意を ON→OFF すると revoked 時刻を渡し注意書きを表示する (UC4)', async () => {
    const onUpdateSettings = vi.fn<(p: { aiConsentRevokedAt?: Date | null }) => void>();
    render(<SettingsPage settings={view({ aiConsentRevokedAt: null })} onUpdateSettings={onUpdateSettings} />);
    fireEvent.click(screen.getByRole('switch', { name: 'AI 利用同意' }));
    await waitFor(() => expect(onUpdateSettings).toHaveBeenCalledOnce());
    const patch = onUpdateSettings.mock.calls[0]?.[0];
    expect(patch?.aiConsentRevokedAt).toBeInstanceOf(Date);
  });

  it('AI 同意が OFF のとき注意書きを表示し、トグルで再同意 (revoked=null) を渡す', async () => {
    const onUpdateSettings = vi.fn();
    render(
      <SettingsPage
        settings={view({ aiConsentRevokedAt: new Date('2026-05-01T00:00:00Z') })}
        onUpdateSettings={onUpdateSettings}
      />,
    );
    expect(screen.getByText(/AI 識別を停止しています/)).toBeTruthy();
    expect(screen.getByRole('switch', { name: 'AI 利用同意' }).getAttribute('aria-checked')).toBe(
      'false',
    );
    fireEvent.click(screen.getByRole('switch', { name: 'AI 利用同意' }));
    await waitFor(() =>
      expect(onUpdateSettings).toHaveBeenCalledWith({ aiConsentRevokedAt: null }),
    );
  });

  it('UC7: 品質改善スイッチで analytics_opt_in を更新する', async () => {
    const onUpdateSettings = vi.fn();
    render(<SettingsPage settings={view({ analyticsOptIn: false })} onUpdateSettings={onUpdateSettings} />);
    fireEvent.click(screen.getByRole('switch', { name: '品質改善への協力' }));
    await waitFor(() => expect(onUpdateSettings).toHaveBeenCalledWith({ analyticsOptIn: true }));
  });

  it('匿名 user (isLinked=false) → 「Google で連携する」CTA + ログアウト/削除非表示', () => {
    render(<SettingsPage settings={view()} isLinked={false} onUpdateSettings={vi.fn()} />);
    expect(screen.getByRole('button', { name: 'Google で連携する' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'ログアウト' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'アカウントを削除' })).toBeNull();
    expect(screen.getByText(/連携してください/)).toBeTruthy();
  });

  it('E-BL-002 流用: 連携 CTA 押下で OAuth ゲートを開き、「連携する」で onLink を起動', () => {
    const onLink = vi.fn();
    render(<SettingsPage settings={view()} isLinked={false} onLink={onLink} onUpdateSettings={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: 'Google で連携する' }));
    expect(screen.getByRole('dialog', { name: 'アカウント連携が必要です' })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: '連携する' }));
    expect(onLink).toHaveBeenCalledOnce();
  });

  it('UC6: 連携済 user → 連携済ステータス (メール) + ログアウト表示', () => {
    const onLogout = vi.fn();
    render(
      <SettingsPage
        settings={view()}
        isLinked
        linkedEmail="seiji@example.com"
        onLogout={onLogout}
        onUpdateSettings={vi.fn()}
      />,
    );
    expect(screen.getByText(/Google アカウント連携済（seiji@example.com）/)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'ログアウト' }));
    expect(onLogout).toHaveBeenCalledOnce();
  });

  it('E-AC-5: 連携済 user の「アカウントを削除」で削除ダイアログを開き、確定で onDeleteAccount を起動', async () => {
    const onDeleteAccount = vi.fn();
    render(
      <SettingsPage
        settings={view()}
        isLinked
        discoveryCount={3}
        imageCount={5}
        onDeleteAccount={onDeleteAccount}
        onUpdateSettings={vi.fn()}
      />,
    );
    // 削除はワンクリックでは起動しない (ダイアログを開くだけ)。
    fireEvent.click(screen.getByRole('button', { name: 'アカウントを削除' }));
    expect(screen.getByRole('dialog', { name: 'アカウント削除' })).toBeTruthy();
    expect(onDeleteAccount).not.toHaveBeenCalled();
    // 二段階 + 明示同意を経て確定。
    fireEvent.click(screen.getByRole('button', { name: '削除を予約' }));
    fireEvent.click(screen.getByLabelText('削除に同意する'));
    fireEvent.click(screen.getByRole('button', { name: '確認しました、削除します' }));
    await waitFor(() => expect(onDeleteAccount).toHaveBeenCalledWith(null));
  });

  it('settingsLoading かつ未取得 → ローディング表示', () => {
    render(<SettingsPage settings={null} settingsLoading onUpdateSettings={vi.fn()} />);
    expect(screen.getByText('読み込み中…')).toBeTruthy();
  });

  it('settingsError → 設定取得エラー表示', () => {
    render(<SettingsPage settings={null} settingsError={new Error('boom')} onUpdateSettings={vi.fn()} />);
    expect(screen.getByRole('alert').textContent).toContain('設定の取得に失敗しました');
  });

  it('saveError (E-AC-004) → 保存失敗フィードバックを表示する', () => {
    render(<SettingsPage settings={view()} saveError={new Error('upsert')} onUpdateSettings={vi.fn()} />);
    expect(screen.getByRole('alert').textContent).toContain('保存できませんでした');
  });

  it('保存成功で「保存しました」toast を表示する', async () => {
    const onUpdateSettings = vi.fn().mockResolvedValue(undefined);
    render(<SettingsPage settings={view()} onUpdateSettings={onUpdateSettings} />);
    fireEvent.click(screen.getByRole('radio', { name: '記録しない' }));
    await waitFor(() => expect(screen.getByRole('status').textContent).toContain('保存しました'));
  });

  it('注入 onUpdateSettings が reject → 保存失敗フィードバックを表示する', async () => {
    const onUpdateSettings = vi.fn().mockRejectedValue(new Error('network'));
    render(<SettingsPage settings={view()} onUpdateSettings={onUpdateSettings} />);
    fireEvent.click(screen.getByRole('radio', { name: '記録しない' }));
    await waitFor(() =>
      expect(screen.getByRole('alert').textContent).toContain('保存できませんでした'),
    );
  });

  it('saving → ラジオ/スイッチが disabled', () => {
    render(<SettingsPage settings={view()} saving onUpdateSettings={vi.fn()} />);
    expect((screen.getByRole('radio', { name: '記録しない' }) as HTMLInputElement).disabled).toBe(
      true,
    );
    expect(
      (screen.getByRole('switch', { name: 'AI 利用同意' }) as HTMLButtonElement).disabled,
    ).toBe(true);
  });
});

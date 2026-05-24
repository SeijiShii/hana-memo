// @vitest-environment happy-dom
/**
 * ConsentGate 単体テスト
 * 由来: docs/legal/001_legal_SPEC.md §1 UC1/UC4 §4.2 (E-LE-003),
 *       004_legal_E2E_TEST.md (E-LE-1/4/5), revise_sentry_disclosure_20260524
 *
 * 再同意判定は実 needsReConsent (versions.ts) を fixture で駆動する (mock しない)。
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ConsentGate } from './ConsentGate';
import { LATEST_VERSIONS } from '../versions';
import type { DocType } from '../../../shared/types/domain';

function renderGate(props: Partial<Parameters<typeof ConsentGate>[0]> = {}) {
  return render(
    <MemoryRouter>
      <ConsentGate onConsent={vi.fn()} {...props} />
    </MemoryRouter>,
  );
}

/** 全 doc を最新に同意済とみなす currentVersions を LATEST_VERSIONS から生成。 */
function allConsented(): Partial<Record<DocType, string>> {
  const cur: Partial<Record<DocType, string>> = {};
  for (const dt of Object.keys(LATEST_VERSIONS) as DocType[]) {
    const v = LATEST_VERSIONS[dt];
    if (v) cur[dt] = v;
  }
  return cur;
}

describe('ConsentGate — 初回同意 (UC1)', () => {
  it('未同意 (currentVersions={}) → 初回同意 gate を表示し、対象 doc 全件のチェックボックスを出す', () => {
    renderGate({ currentVersions: {} });
    expect(screen.getByRole('dialog', { name: 'ご利用にあたっての同意' })).toBeTruthy();
    // LATEST_VERSIONS で version が非 null の doc = 同意対象 (cookie_policy は null で除外)。
    const required = (Object.keys(LATEST_VERSIONS) as DocType[]).filter((d) => LATEST_VERSIONS[d]);
    expect(screen.getAllByRole('checkbox')).toHaveLength(required.length);
  });

  it('全チェック前は「同意して始める」が disabled + ヒント表示', () => {
    renderGate({ currentVersions: {} });
    const btn = screen.getByRole('button', { name: '同意して始める' }) as HTMLButtonElement;
    expect(btn.disabled).toBe(true);
    expect(screen.getByText('全項目に同意が必要です')).toBeTruthy();
  });

  it('E-LE-1: 全チェック → ボタン enabled → 押下で onConsent に対象 doc 全件を渡す', async () => {
    const onConsent = vi.fn<(d: DocType[]) => void>();
    renderGate({ currentVersions: {}, onConsent });
    const boxes = screen.getAllByRole('checkbox');
    boxes.forEach((b) => fireEvent.click(b));
    const btn = screen.getByRole('button', { name: '同意して始める' }) as HTMLButtonElement;
    expect(btn.disabled).toBe(false);
    fireEvent.click(btn);
    const required = (Object.keys(LATEST_VERSIONS) as DocType[]).filter((d) => LATEST_VERSIONS[d]);
    await waitFor(() => expect(onConsent).toHaveBeenCalledWith(required));
  });
});

describe('ConsentGate — 同意済 (gate 通過)', () => {
  it('全 doc を最新に同意済 → 何も描画しない', () => {
    const { container } = renderGate({ currentVersions: allConsented() });
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(container.firstChild).toBeNull();
  });
});

describe('ConsentGate — 改訂再同意 (UC4)', () => {
  it('privacy のみ stale (v1.0.0 < latest) → privacy だけ再同意 gate に出る', () => {
    // latest を fixture で固定 (privacy を bump 済とみなす)。
    const latest: Record<DocType, string | null> = {
      privacy_policy: 'v1.1.0',
      terms_of_service: 'v1.0.0',
      ai_usage: 'v1.0.0',
      cookie_policy: null,
    };
    renderGate({
      currentVersions: { privacy_policy: 'v1.0.0', terms_of_service: 'v1.0.0', ai_usage: 'v1.0.0' },
      latestVersions: latest,
    });
    expect(screen.getByRole('dialog', { name: '規約改訂への再同意' })).toBeTruthy();
    // privacy 1 件だけチェックボックスが出る (tos / ai_usage は最新なので出ない)。
    expect(screen.getAllByRole('checkbox')).toHaveLength(1);
    expect(screen.getByText('プライバシーポリシー')).toBeTruthy();
    expect(screen.queryByText('利用規約')).toBeNull();
  });

  it('再同意ボタンは「同意して続ける」、押下で stale doc のみ onConsent に渡す', async () => {
    const onConsent = vi.fn<(d: DocType[]) => void>();
    const latest: Record<DocType, string | null> = {
      privacy_policy: 'v1.1.0',
      terms_of_service: 'v1.0.0',
      ai_usage: 'v1.0.0',
      cookie_policy: null,
    };
    renderGate({
      currentVersions: { privacy_policy: 'v1.0.0', terms_of_service: 'v1.0.0', ai_usage: 'v1.0.0' },
      latestVersions: latest,
      onConsent,
    });
    fireEvent.click(screen.getByRole('checkbox'));
    fireEvent.click(screen.getByRole('button', { name: '同意して続ける' }));
    await waitFor(() => expect(onConsent).toHaveBeenCalledWith(['privacy_policy']));
  });

  it('V04: current のバージョンが形式不正 → 安全側で再同意要求 (gate 表示)', () => {
    renderGate({
      currentVersions: { privacy_policy: 'broken', terms_of_service: 'v1.0.0', ai_usage: 'v1.0.0' },
    });
    expect(screen.getByRole('dialog')).toBeTruthy();
    // 形式不正の privacy が diffs に入る。
    expect(screen.getByText('プライバシーポリシー')).toBeTruthy();
  });
});

describe('ConsentGate — 拒否フロー (E-LE-003)', () => {
  it('「閉じる」押下 → サービス利用不可表示 + onReject 起動', () => {
    const onReject = vi.fn();
    renderGate({ currentVersions: {}, onReject });
    fireEvent.click(screen.getByRole('button', { name: '閉じる' }));
    expect(screen.getByRole('dialog', { name: 'サービスを利用できません' })).toBeTruthy();
    expect(screen.getByText('同意がいただける場合は再度起動してください。')).toBeTruthy();
    expect(onReject).toHaveBeenCalledOnce();
  });

  it('利用不可表示から「同意画面に戻る」で同意 gate に復帰', () => {
    renderGate({ currentVersions: {} });
    fireEvent.click(screen.getByRole('button', { name: '閉じる' }));
    fireEvent.click(screen.getByRole('button', { name: '同意画面に戻る' }));
    expect(screen.getByRole('dialog', { name: 'ご利用にあたっての同意' })).toBeTruthy();
  });
});

describe('ConsentGate — 状態表示', () => {
  it('submitting → 「処理中…」+ ボタン disable + checkbox disable', () => {
    renderGate({ currentVersions: {}, submitting: true });
    const btn = screen.getByRole('button', { name: '処理中…' }) as HTMLButtonElement;
    expect(btn.disabled).toBe(true);
    expect(btn.getAttribute('aria-busy')).toBe('true');
    expect((screen.getAllByRole('checkbox')[0] as HTMLInputElement).disabled).toBe(true);
  });

  it('E-LE-001: error → 同意保存失敗フィードバック表示', () => {
    renderGate({ currentVersions: {}, error: new Error('insert failed') });
    expect(screen.getByRole('alert').textContent).toContain('同意の保存に失敗しました');
  });

  it('注入 onConsent が reject → ローカルエラーフィードバックを表示する', async () => {
    const onConsent = vi.fn().mockRejectedValue(new Error('network'));
    renderGate({ currentVersions: {}, onConsent });
    screen.getAllByRole('checkbox').forEach((b) => fireEvent.click(b));
    fireEvent.click(screen.getByRole('button', { name: '同意して始める' }));
    await waitFor(() =>
      expect(screen.getByRole('alert').textContent).toContain('同意の保存に失敗しました'),
    );
  });
});

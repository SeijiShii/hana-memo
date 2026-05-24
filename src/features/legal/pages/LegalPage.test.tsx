// @vitest-environment happy-dom
/**
 * LegalPage 単体テスト
 * 由来: docs/legal/001_legal_SPEC.md §1 UC2, 002_legal_PLAN.md §1.1/§1.3
 */
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { LegalPage, type LegalDoc } from './LegalPage';
import { LEGAL_DOC_BODY } from '../docs';

function renderPage(doc: LegalDoc) {
  return render(
    <MemoryRouter>
      <LegalPage doc={doc} />
    </MemoryRouter>,
  );
}

describe('LegalPage', () => {
  it('プライバシーポリシー: h1 にタイトル + バージョン + リード文 + 戻るリンク', () => {
    renderPage('privacy_policy');
    const body = LEGAL_DOC_BODY.privacy_policy;
    expect(screen.getByRole('heading', { level: 1 }).textContent).toContain(body.label);
    expect(screen.getByRole('heading', { level: 1 }).textContent).toContain(body.version);
    expect(screen.getByText(body.lead)).toBeTruthy();
    expect(screen.getByRole('link', { name: '← 戻る' }).getAttribute('href')).toBe('/');
  });

  it('プライバシーポリシー: 全章見出しを表示する (Sentry/PII スクラブ開示見出しを含む)', () => {
    renderPage('privacy_policy');
    const headings = screen.getAllByRole('heading', { level: 2 }).map((h) => h.textContent);
    // revise_sentry_disclosure: Sentry への送信前 PII スクラブの章が含まれる。
    expect(headings.some((h) => h?.includes('Sentry'))).toBe(true);
    expect(headings.length).toBe(LEGAL_DOC_BODY.privacy_policy.sections.length);
  });

  it('利用規約: タイトル + 章見出しを表示する', () => {
    renderPage('terms_of_service');
    expect(screen.getByRole('heading', { level: 1 }).textContent).toContain('利用規約');
    expect(screen.getAllByRole('heading', { level: 2 }).length).toBe(
      LEGAL_DOC_BODY.terms_of_service.sections.length,
    );
  });

  it('AI 利用同意: 送信データ等の章見出しを表示する', () => {
    renderPage('ai_usage');
    const headings = screen.getAllByRole('heading', { level: 2 }).map((h) => h.textContent);
    expect(headings.some((h) => h?.includes('送信されるデータ'))).toBe(true);
  });

  it('特商法表記 (scta): タイトル + 章見出しを表示する', () => {
    renderPage('scta');
    expect(screen.getByRole('heading', { level: 1 }).textContent).toContain('特定商取引法');
    expect(screen.getAllByRole('heading', { level: 2 }).length).toBe(
      LEGAL_DOC_BODY.scta.sections.length,
    );
  });

  it('本文未確定のプレースホルダ「（本文は公開前に確定）」を各章に表示する', () => {
    renderPage('terms_of_service');
    const placeholders = screen.getAllByText('（本文は公開前に確定）');
    expect(placeholders.length).toBe(LEGAL_DOC_BODY.terms_of_service.sections.length);
  });
});

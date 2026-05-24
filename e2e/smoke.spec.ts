/**
 * E2E スモーク (ローカル headless、no-key) — app が実ブラウザで boot し、主要ルートが
 * クラッシュせず描画され、下部ナビ遷移が機能することを検証する。
 *
 * 背景: keyless white-screen 不具合 (fix(auth) 8195040) の回帰防止を兼ねる。実 Clerk/Stripe/R2/
 * OpenAI を要するフロー (sign-in / checkout / upload / identify) は対象外 (runtime/Class B)。
 *
 * 関連: docs/legal/004_legal_E2E_TEST.md, docs/notebook/004_notebook_E2E_TEST.md,
 *       docs/account/004_account_E2E_TEST.md, docs/E2E_GATE_STATUS_20260524.md
 */
import { test, expect } from '@playwright/test';

test.describe('app boot & ランディング', () => {
  test('ランディングが描画され、pageerror が出ない', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));

    await page.goto('/');
    await expect(page.getByRole('heading', { name: /hana-memo/ })).toBeVisible();
    await expect(page.getByRole('link', { name: '撮影する' })).toBeVisible();
    await expect(page.getByRole('link', { name: '発見ノート' })).toBeVisible();

    expect(errors, `pageerrors: ${errors.join(' | ')}`).toHaveLength(0);
  });

  test('keyless: 認証未設定の通知バナーが出る (graceful degradation)', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('note', { name: '認証未設定の通知' })).toBeVisible();
  });

  test('ランディングから「発見ノート」で /notebook へ遷移できる', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('link', { name: '発見ノート' }).click();
    await expect(page).toHaveURL(/\/notebook$/);
    await expect(page.getByRole('navigation', { name: 'メインナビゲーション' })).toBeVisible();
  });
});

test.describe('下部ナビ遷移 (AppShell)', () => {
  test('図鑑 → 撮影 → 設定 を下部ナビで行き来できる', async ({ page }) => {
    await page.goto('/notebook');
    const nav = page.getByRole('navigation', { name: 'メインナビゲーション' });
    await expect(nav).toBeVisible();

    await nav.getByRole('link', { name: /撮影/ }).click();
    await expect(page).toHaveURL(/\/capture$/);

    await nav.getByRole('link', { name: /設定/ }).click();
    await expect(page).toHaveURL(/\/settings$/);

    await nav.getByRole('link', { name: /図鑑/ }).click();
    await expect(page).toHaveURL(/\/notebook$/);
  });

  test('/notebook は未 sign-in で空状態を描画する (クラッシュしない)', async ({ page }) => {
    await page.goto('/notebook');
    await expect(page.getByText('まだ発見がありません')).toBeVisible();
  });

  test('/settings は設定セクションを描画する', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await page.goto('/settings');
    await expect(page.getByText('位置情報精度')).toBeVisible();
    await expect(page.getByText('AI 利用同意')).toBeVisible();
    expect(errors, `pageerrors: ${errors.join(' | ')}`).toHaveLength(0);
  });
});

test.describe('公開 legal ページ (認証不要、UC2)', () => {
  test('/legal/privacy がプライバシーポリシーを描画する', async ({ page }) => {
    await page.goto('/legal/privacy');
    await expect(page.getByRole('heading', { name: 'プライバシーポリシー' })).toBeVisible();
  });

  test('/legal/terms が利用規約を描画する', async ({ page }) => {
    await page.goto('/legal/terms');
    await expect(page.getByRole('heading', { name: '利用規約' })).toBeVisible();
  });
});

/**
 * E2E (ローカル headless、no-key) — billing revise_001 (guest-billing) の中核挙動を検証する。
 *
 * 検証する revise の本質:
 *   - ゲスト (未 sign-in / keyless) のまま /billing が購入導線を描画する (旧 OAuth リンク必須ゲート撤廃)。
 *   - 価格は ¥100 = AI 10 回の単発購入 (PWYW スライダ / PDF unlock / 書き出しは全廃)。
 *   - trial 切れ相当の文脈でも「連携が必要」要求は出ず、購入導線のみ (E2E-R-01 の意図)。
 *
 * 実 Stripe Checkout (E2E-R-02/03) / OAuth 連携 (E2E-R-04) / migration apply (E2E-R-M1) は
 * 実 keys + Vercel preview = Class B のため本 spec の対象外 (docs/E2E_GATE_STATUS_20260524.md と整合)。
 *
 * 環境: vite preview (本番ビルド配信、/api/* は未配信) → token=null の keyless 経路を検証する。
 *
 * 関連: docs/billing/revise_001_20260526_guest-billing/004_REVISE_E2E_TEST.md (E2E-R-01),
 *       src/features/billing/pages/BillingPage.tsx, src/features/billing/BillingContainer.tsx
 */
import { test, expect } from '@playwright/test';

test.describe('billing 購入導線 (guest-billing、keyless = Class A)', () => {
  test('keyless でも /billing が ¥100=10回 の単発購入導線を描画する', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));

    await page.goto('/billing');

    // 画面が boot し購入セクションが描画される (keyless でクラッシュしない)。
    await expect(page.getByRole('heading', { name: 'クレジット購入' })).toBeVisible();

    // 価格 = ¥100 で AI 10 回 (revise の pricing 変更)。JSX のテキストノード分割を許容して正規化一致。
    await expect(
      page.getByText(/1 セット\s*¥100\s*で AI 識別が\s*10\s*回追加されます/),
    ).toBeVisible();

    // 合計表示も ¥100 / 10 回追加 (qty cap=1 の既定)。
    await expect(page.getByText(/合計\s*¥100（10 回追加）/)).toBeVisible();

    // 購入導線 (Stripe Checkout の seam) が直接提示される。
    await expect(page.getByRole('button', { name: /購入する/ })).toBeVisible();

    expect(errors, `pageerrors: ${errors.join(' | ')}`).toHaveLength(0);
  });

  test('/billing は OAuth 連携必須ゲートを出さない (mustLink 撤廃、購入導線のみ)', async ({
    page,
  }) => {
    await page.goto('/billing');

    // 購入ボタンが連携ゲートに隠されず直接表示される。
    await expect(page.getByRole('button', { name: /購入する/ })).toBeVisible();

    // 連携モーダル (OAuthRequiredModal「アカウントを連携する」) は billing パスに出ない (E2E-R-01: 購入は連携不要)。
    await expect(page.getByText('アカウントを連携する')).toHaveCount(0);
  });

  test('/billing に廃止機能 (PWYW スライダ / PDF unlock / 書き出し) が残っていない (回帰ガード)', async ({
    page,
  }) => {
    await page.goto('/billing');

    // PWYW の任意金額スライダは廃止 (単発固定価格のみ)。
    await expect(page.getByRole('slider')).toHaveCount(0);

    // revise_002: 数量入力 (AI_QTY_MAX=1 で選択肢ゼロ) は撤去 (E2E-R2-01)。
    await expect(page.getByLabel('数量')).toHaveCount(0);
    await expect(page.getByText(/合計/)).toHaveCount(0);

    // PDF unlock / 書き出し (export) の導線は全廃。
    await expect(page.getByText(/PDF/)).toHaveCount(0);
    await expect(page.getByText(/書き出し|エクスポート/)).toHaveCount(0);

    // 「おまかせ」(pay-what-you-want) の文言も残っていない。
    await expect(page.getByText(/おまかせ/)).toHaveCount(0);
  });
});

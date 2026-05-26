import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright E2E 設定 — ローカル headless (dev server 相手 = Class A)。
 *
 * 本番ビルド (dist) を `vite preview` で配信し、headless Chromium で UI 統合スモークを実行する。
 * `/api/*` は Vercel Functions のため preview では配信されない → 認証/データ不要の no-key ジャーニー
 * (ランディング / ナビ / 公開 legal ページ / 空状態 / keyless graceful) を対象とする。
 * 実 Clerk/Stripe/R2/OpenAI を要するフロー + Vercel preview 実行 (Class B) は本設定の対象外。
 *
 * 関連: docs/<feature>/004_E2E_TEST.md, docs/E2E_GATE_STATUS_20260524.md
 */
const PORT = 4173;

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    // 自己完結: 最新ソースをビルドして preview 配信。ローカルでは既存 preview を再利用する。
    //
    // keyless 決定性: 本 E2E は no-key ジャーニー専用 (Class A)。ビルドは必ず keyless で行う。
    // `.env.local` に実 Clerk キー (VITE_CLERK_PUBLISHABLE_KEY) が入っていても (リリース準備等)、
    // Vite は process.env の VITE_* を最優先するため、空値で上書きして keyless 起動を強制する。
    // これがないと ambient な実キーがビルドに inline され keyless graceful 回帰テストが揺れる。
    command: `VITE_CLERK_PUBLISHABLE_KEY= npm run build && npm run preview -- --port ${PORT} --strictPort`,
    url: `http://localhost:${PORT}`,
    timeout: 120_000,
    reuseExistingServer: !process.env.CI,
  },
});

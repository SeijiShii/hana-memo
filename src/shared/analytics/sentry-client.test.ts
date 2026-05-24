/**
 * sentry-client.ts 単体テスト ([SEC-004] 実 SDK バインディングの beforeSend scrub 配線)
 * 実 @sentry/browser は注入 client で代替。
 */
import { describe, it, expect, vi } from 'vitest';
import { initBrowserSentry } from './sentry-client';
import { scrubBeforeSend, scrubBeforeBreadcrumb, type SentryLike } from './sentry';

function fakeClient(): SentryLike & { init: ReturnType<typeof vi.fn>; captureException: ReturnType<typeof vi.fn> } {
  return { init: vi.fn(), captureException: vi.fn() };
}

describe('initBrowserSentry', () => {
  it('[SEC-004] opt-in + dsn → init を beforeSend=scrubBeforeSend で呼ぶ + uid hash 化', async () => {
    const client = fakeClient();
    const ok = await initBrowserSentry({ id: 'clerk_raw_1', analyticsOptIn: true }, {
      client,
      dsn: 'https://dsn.example',
    });
    expect(ok).toBe(true);
    expect(client.init).toHaveBeenCalledOnce();
    const opts = client.init.mock.calls[0]![0] as {
      dsn: string;
      beforeSend: unknown;
      beforeBreadcrumb: unknown;
      initialScope: { user: { id: string } };
    };
    expect(opts.dsn).toBe('https://dsn.example');
    expect(opts.beforeSend).toBe(scrubBeforeSend);
    expect(opts.beforeBreadcrumb).toBe(scrubBeforeBreadcrumb);
    expect(opts.initialScope.user.id).not.toBe('clerk_raw_1'); // SHA-256 hash 化
    expect(opts.initialScope.user.id).toMatch(/^[0-9a-f]{64}$/);
  });

  it('dsn 空 → init せず false', async () => {
    const client = fakeClient();
    const ok = await initBrowserSentry({ id: 'clerk_1', analyticsOptIn: true }, { client, dsn: '' });
    expect(ok).toBe(false);
    expect(client.init).not.toHaveBeenCalled();
  });

  it('opt-out user → dsn ありでも init 呼ばれない (PII 流出ゼロ)', async () => {
    const client = fakeClient();
    const ok = await initBrowserSentry({ id: 'clerk_1', analyticsOptIn: false }, {
      client,
      dsn: 'https://dsn.example',
    });
    expect(ok).toBe(true);
    expect(client.init).not.toHaveBeenCalled();
  });
});

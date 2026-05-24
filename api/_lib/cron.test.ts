/**
 * api/_lib/cron.ts 単体テスト (Vercel Cron Bearer 認証)
 */
import { describe, it, expect } from 'vitest';
import { assertCronAuth, CronAuthError } from './cron';

function req(auth?: string): Request {
  return new Request('http://localhost/api/cron', {
    headers: auth ? { authorization: auth } : {},
  });
}

const ENV = { CRON_SECRET: 'sekret' } as unknown as NodeJS.ProcessEnv;

describe('assertCronAuth', () => {
  it('正しい Bearer で通過する', () => {
    expect(() => assertCronAuth(req('Bearer sekret'), ENV)).not.toThrow();
  });

  it('不一致 / 欠落は CronAuthError (401)', () => {
    expect(() => assertCronAuth(req('Bearer wrong'), ENV)).toThrow(CronAuthError);
    expect(() => assertCronAuth(req(), ENV)).toThrow(CronAuthError);
  });

  it('CRON_SECRET 未設定は設定漏れとして throw (fail-closed)', () => {
    expect(() => assertCronAuth(req('Bearer x'), {} as unknown as NodeJS.ProcessEnv)).toThrow(
      /CRON_SECRET/,
    );
  });
});

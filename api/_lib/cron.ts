/**
 * Vercel Cron 認証 (共通)
 *
 * Vercel Cron は `CRON_SECRET` 設定時に `Authorization: Bearer <CRON_SECRET>` を付けて呼ぶ。
 * cron handler はこれを検証して外部からの無認証実行を拒否する。fail-closed (secret 未設定は throw)。
 *
 * 関連: docs/_shared/analytics/001_analytics_SPEC.md (Vercel Cron), vercel.json crons
 */

/** cron 認証失敗 (401 にマップ)。 */
export class CronAuthError extends Error {
  readonly status = 401;
  constructor(message = 'Unauthorized cron request') {
    super(message);
    this.name = 'CronAuthError';
  }
}

/** Vercel Cron の Bearer トークンを検証する。CRON_SECRET 未設定は設定漏れとして throw。 */
export function assertCronAuth(req: Request, env: NodeJS.ProcessEnv = process.env): void {
  const secret = env.CRON_SECRET;
  if (!secret) {
    throw new Error('CRON_SECRET is not set');
  }
  const auth = req.headers.get('authorization') ?? '';
  if (auth !== `Bearer ${secret}`) {
    throw new CronAuthError();
  }
}

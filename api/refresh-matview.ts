/**
 * api_usage_monthly matview 再構築 cron (GET /api/refresh-matview、日次 03:00)
 *
 * Vercel Cron 認証 → `refreshMonthlyMatview` (CONCURRENTLY)。コスト集計の鮮度維持。
 *
 * 関連: docs/_shared/analytics/cost.ts, vercel.json crons
 */
import { assertCronAuth, CronAuthError } from './_lib/cron';

function jsonResponse(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

export const config = { runtime: 'nodejs' };

/** Vercel Cron handler。 */
export default async function handler(req: Request): Promise<Response> {
  try {
    assertCronAuth(req);
  } catch (err) {
    return jsonResponse({ error: 'unauthorized' }, err instanceof CronAuthError ? err.status : 500);
  }
  try {
    const { refreshMonthlyMatview } = await import('../src/shared/analytics/cost');
    await refreshMonthlyMatview();
    return jsonResponse({ ok: true }, 200);
  } catch (err) {
    console.error('refresh-matview failed', err);
    return jsonResponse({ error: 'internal' }, 500);
  }
}

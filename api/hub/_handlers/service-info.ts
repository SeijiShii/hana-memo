/**
 * service-hub 連携 service-info エンドポイント (GET /api/hub/service-info)
 *
 * service-hub (内部運用ダッシュボード) が各サービスから pull するアプリ層指標の標準契約。
 * 契約 SoT = service-hub [論点-003] 確定 (perspectives O48):
 *   - 認証: 共有シークレット `HUB_SHARED_SECRET` (Authorization: Bearer <secret> or x-hub-secret)。読み取り専用。
 *           公開ヘルス `/api/health` (uptime ping) とは分離。
 *   - レスポンス: { schemaVersion, service, status, metrics?[], version?, extra? } (案A=最小固定+extra)
 *   - metrics[] = サービスしか知らないアプリ層指標 (PaaS API で取れる帯域/DB/MAU は HUB が別途 pull)。
 *
 * v1 は status + version の最小契約 (metrics は順次拡充)。未確定項目は省略 (optional)。
 * 関連: ~/.claude/flow-data/perspectives.md O48 / service-hub concept §6.1 [論点-003]
 */

export type ServiceMetric = { key: string; value: number; unit?: string };
export type ServiceInfoResponse = {
  schemaVersion: number;
  service: string;
  status: 'ok' | 'degraded' | 'down';
  metrics?: ServiceMetric[];
  version?: string;
  extra?: Record<string, unknown>;
};

const SCHEMA_VERSION = 1;
const SERVICE = 'hana-memo';

/**
 * 共有シークレットを検証する (純関数)。`Authorization: Bearer <secret>` または `x-hub-secret: <secret>`。
 * 戻り: 'ok' | 'unconfigured' (env 未設定) | 'unauthorized' (不一致/欠落)。
 */
export function verifyHubSecret(req: Request, configured: string | undefined): 'ok' | 'unconfigured' | 'unauthorized' {
  if (!configured) {
    return 'unconfigured';
  }
  const bearer = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
  const custom = req.headers.get('x-hub-secret') ?? undefined;
  const provided = bearer || custom;
  return provided && provided === configured ? 'ok' : 'unauthorized';
}

/** service-info ペイロードを構築する (純関数)。version は Vercel git sha 由来 (無ければ省略)。 */
export function buildServiceInfo(env: NodeJS.ProcessEnv = process.env): ServiceInfoResponse {
  const sha = env.VERCEL_GIT_COMMIT_SHA;
  return {
    schemaVersion: SCHEMA_VERSION,
    service: SERVICE,
    status: 'ok',
    metrics: [],
    ...(sha ? { version: sha.slice(0, 7) } : {}),
    extra: { note: 'アプリ層 metrics (識別数/クレジット販売/エラー) は順次追加' },
  };
}

function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

/** Vercel Web handler。HUB からの GET を共有シークレットで認証して service-info を返す。 */
async function handler(req: Request): Promise<Response> {
  if (req.method !== 'GET') {
    return new Response('Method Not Allowed', { status: 405 });
  }
  switch (verifyHubSecret(req, process.env.HUB_SHARED_SECRET)) {
    case 'unconfigured':
      return json({ error: 'hub_secret_not_configured' }, 503);
    case 'unauthorized':
      return json({ error: 'unauthorized' }, 401);
    case 'ok':
      return json(buildServiceInfo(), 200);
  }
}

export const config = { runtime: 'nodejs' };
export default { fetch: handler };

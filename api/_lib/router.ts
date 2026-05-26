/**
 * グループ catch-all router (revise_001 function-consolidation)。
 *
 * `/api/<group>/<action>` の <action> segment を見て sub-handler に dispatch する。
 * 各 sub-handler は Vercel Web 標準シグネチャ `(req: Request) => Promise<Response>`
 * (= default export `{ fetch }` の fetch、fix_001 で統一)。
 *
 * 目的: Vercel Hobby の「1 デプロイ最大 12 Serverless Functions」上限対応。
 * 1 グループ = 1 catch-all function (`api/<group>/[...path].ts`) に集約し関数数を縛る
 * (perspectives O49)。フロントの `/api/<group>/<action>` URL は不変 = 後方互換。
 */
export type FetchHandler = (req: Request) => Promise<Response> | Response;

function notFound(): Response {
  return new Response(JSON.stringify({ error: 'not_found' }), {
    status: 404,
    headers: { 'content-type': 'application/json' },
  });
}

/**
 * group 名と `{ <action>: handler }` マップから catch-all の `{ fetch }` を作る。
 * 未知 action (または action segment 不在) は 404 `{ error: 'not_found' }`。
 */
export function createGroupRouter(
  group: string,
  handlers: Record<string, FetchHandler>,
): { fetch: FetchHandler } {
  return {
    fetch: (req: Request): Promise<Response> | Response => {
      const { pathname } = new URL(req.url);
      const parts = pathname.split('/').filter(Boolean); // 例: ["api","storage","upload-url"]
      const groupIndex = parts.indexOf(group);
      const action = groupIndex >= 0 ? parts[groupIndex + 1] : undefined;
      const handler = action ? handlers[action] : undefined;
      return handler ? handler(req) : notFound();
    },
  };
}

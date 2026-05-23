/**
 * Smoke endpoint #2 (concept §4.5.7) — dev 起動スクリプト `scripts/dev.sh` の疎通確認先。
 * SDK 依存ゼロで常に 200 を返し、app/api パイプラインが生きていることを示す。
 *
 * 注: 型は構造的に最小定義 (Vercel Functions の Node ランタイム req/res と互換)。
 * Milestone B の実 API ハンドラでは `@vercel/node` の VercelRequest/VercelResponse を使う。
 */
type HealthResponse = {
  status: (code: number) => { json: (body: unknown) => void };
};

export default function handler(_req: unknown, res: HealthResponse): void {
  res.status(200).json({ ok: true, service: 'hana-memo', ts: new Date().toISOString() });
}

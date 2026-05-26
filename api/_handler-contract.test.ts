import { describe, it, expect } from 'vitest';

/**
 * Vercel Function handler export-shape 契約テスト (regression: fix_001 vercel-handler-signature)
 *
 * Vercel の Node.js runtime が対応する default export 形は:
 *   (a) `export default { fetch(req: Request): Response }`  — Web fetch standard export
 *   (b) `export default (req, res) => void`                 — Node legacy (req,res) 形
 * 非対応: `export default function handler(req: Request): Response` (引数 1 の素の関数)。
 *   → Vercel は (b) と誤認し req に IncomingMessage を渡す + 返り値 Response を無視
 *   → res.end() が呼ばれず **リクエストが永久に hang** (本番含む)。
 *
 * 元バグ (D20260525): 全 23 handler がこの非対応形で書かれ本番で全 API hang。
 * 865 unit test は handler を直呼びせず named helper のみ import していたため契約を検証できず見逃した。
 * 本テストは各 /api endpoint の **実 default export 形** を runtime import で検証し再発を防ぐ。
 */

// Vite/Vitest の import.meta.glob で api 配下の全 .ts を遅延 importer として収集。
const modules = import.meta.glob('./**/*.ts');

/** ルーティング対象の endpoint ファイルか (Vercel は _ 前置・_lib を route 化しない / test は除外)。 */
function isEndpoint(path: string): boolean {
  if (path.includes('/_lib/')) return false;
  if (path.includes('/_handlers/')) return false; // catch-all の sub-handler は route ではない (revise_001)
  const base = path.split('/').pop() ?? '';
  if (base.startsWith('_')) return false; // _ 前置 = Vercel が route 化しない
  if (base.endsWith('.test.ts') || base.endsWith('.d.ts')) return false;
  return true;
}

/** catch-all の sub-handler ファイルか (`api/<group>/_handlers/<action>.ts`)。 */
function isSubHandler(path: string): boolean {
  if (!path.includes('/_handlers/')) return false;
  const base = path.split('/').pop() ?? '';
  return !base.endsWith('.test.ts') && !base.endsWith('.d.ts');
}

describe('Vercel Function handler export contract', () => {
  const endpoints = Object.keys(modules).filter(isEndpoint).sort();

  it('stays within the Vercel Hobby 12-Serverless-Function limit (revise_001 / O49)', () => {
    // function-consolidation 後は 11 関数 (group catch-all 9 + health + identify-plant)。
    // 上限 12 を恒久ガード: 新 endpoint 追加で 13 になったら group catch-all への集約を促す (perspectives O49)。
    // 下限 9 は glob 破損 (near 0) の検知用。
    expect(endpoints.length).toBeGreaterThanOrEqual(9);
    expect(endpoints.length).toBeLessThanOrEqual(12);
  });

  for (const path of endpoints) {
    it(`${path}: default export is a Vercel-supported handler shape`, async () => {
      const mod = (await modules[path]!()) as { default?: unknown };
      const def = mod.default;
      expect(def, `${path} must have a default export`).toBeDefined();

      const isFetchObject =
        typeof def === 'object' &&
        def !== null &&
        typeof (def as { fetch?: unknown }).fetch === 'function';
      // Node (req,res) handler は引数 2 つ。素の Web-as-default 関数は引数 1 (= 非対応)。
      const isNodeHandler =
        typeof def === 'function' && (def as (...a: unknown[]) => unknown).length >= 2;

      const arity = typeof def === 'function' ? (def as (...a: unknown[]) => unknown).length : -1;
      expect(
        isFetchObject || isNodeHandler,
        `${path}: default export must be { fetch(req) } (Web) or (req,res)=>{} (Node), ` +
          `but got ${typeof def}${arity >= 0 ? ` with arity ${arity}` : ''}. ` +
          `A bare 'export default function handler(req: Request)' (arity 1) hangs on Vercel.`,
      ).toBe(true);
    });
  }
});

describe('catch-all sub-handler export contract (revise_001)', () => {
  // catch-all (`api/<group>/[...path].ts`) が import して `.fetch` を dispatch する sub-handler は
  // 必ず `{ fetch(req) }` 形でなければならない (router が `handler.fetch` を呼ぶため)。
  const subHandlers = Object.keys(modules).filter(isSubHandler).sort();

  for (const path of subHandlers) {
    it(`${path}: default export is { fetch(req) } (router dispatch 対象)`, async () => {
      const mod = (await modules[path]!()) as { default?: unknown };
      const def = mod.default;
      const isFetchObject =
        typeof def === 'object' &&
        def !== null &&
        typeof (def as { fetch?: unknown }).fetch === 'function';
      expect(
        isFetchObject,
        `${path}: sub-handler の default export は { fetch } である必要があります (catch-all が .fetch を呼ぶ)`,
      ).toBe(true);
    });
  }
});

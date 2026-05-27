#!/usr/bin/env node
/**
 * Vercel Build Output API ビルダー (deploy fix: ESM extensionless import 対策)。
 *
 * 背景: Vercel @vercel/node は api/*.ts を trace モード (非 bundle) で ESM にコンパイルするため、
 * `"type":"module"` 下では拡張子なし相対 import (`../_lib/router` 等) が Node ESM で解決できず
 * 本番関数が全て ERR_MODULE_NOT_FOUND (500) になる (初回実デプロイで露見)。
 *
 * 対策: 各 api 関数を esbuild で **bundle** (相対 import を 1 ファイルに inline) し、
 * Build Output API (`.vercel/output`) を自前生成する。frontend は vite build → static へ。
 *
 * 関連: docs/_shared/api/fix_002 配下 / perspectives O49・O50 / vercel.json (crons)
 */
import { build as esbuild } from 'esbuild';
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const OUT = path.join(ROOT, '.vercel/output');
const FN_OUT = path.join(OUT, 'functions');

// --- 1. frontend (vite) ---
console.log('[vercel-build] vite build…');
execSync('npx vite build', { stdio: 'inherit' });

fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(path.join(OUT, 'static'), { recursive: true });
fs.cpSync(path.join(ROOT, 'dist'), path.join(OUT, 'static'), { recursive: true });

// --- 2. api 関数を収集 (route = `_`前置/_handlers/_lib/test を除く api/**/*.ts) ---
function collectRoutes(dir, acc = []) {
  for (const name of fs.readdirSync(dir)) {
    const full = path.join(dir, name);
    const rel = path.relative(path.join(ROOT, 'api'), full);
    if (fs.statSync(full).isDirectory()) {
      if (name === '_lib' || name === '_handlers' || name.startsWith('_')) continue;
      collectRoutes(full, acc);
    } else if (name.endsWith('.ts') && !name.endsWith('.test.ts') && !name.endsWith('.d.ts')) {
      acc.push(rel.replace(/\.ts$/, '')); // 例: "auth/[...path]" / "health"
    }
  }
  return acc;
}
const routes = collectRoutes(path.join(ROOT, 'api'));
console.log(`[vercel-build] ${routes.length} functions:`, routes.join(', '));

// --- 3. 各関数を bundle して .func を生成 ---
for (const route of routes) {
  const entry = path.join(ROOT, 'api', `${route}.ts`);
  const funcDir = path.join(FN_OUT, 'api', `${route}.func`);
  fs.mkdirSync(funcDir, { recursive: true });
  await esbuild({
    entryPoints: [entry],
    bundle: true,
    platform: 'node',
    format: 'esm',
    target: 'node20',
    outfile: path.join(funcDir, 'index.mjs'),
    external: ['pg-native'], // pg の optional native binding (無くても動く)
    logLevel: 'error',
    banner: {
      // esbuild ESM 出力で CJS dep が require/__dirname を使う場合のシム
      js: "import{createRequire as ___cr}from'module';const require=___cr(import.meta.url);import{fileURLToPath as ___f}from'url';import{dirname as ___d}from'path';const __filename=___f(import.meta.url);const __dirname=___d(__filename);",
    },
  });
  fs.writeFileSync(
    path.join(funcDir, '.vc-config.json'),
    JSON.stringify(
      {
        handler: 'index.mjs',
        runtime: 'nodejs22.x',
        launcherType: 'Nodejs',
        shouldAddHelpers: true,
        shouldAddSourcemapSupport: true,
      },
      null,
      2,
    ),
  );
}

// --- 4. config.json (routing + crons) ---
// 各 catch-all グループは正規表現で .func に rewrite (元 req.url は関数に保持され router が segment 解決)。
const catchAllGroups = routes
  .filter((r) => r.includes('[...'))
  .map((r) => r.split('/')[0]); // 例: "auth"
const apiRouteRules = catchAllGroups.map((g) => ({
  src: `^/api/${g}(?:/.*)?$`,
  dest: `/api/${g}/[...path]`,
}));

// crons は Build Output API の config.json が唯一の真実 (vercel.json と二重定義すると
// "duplicated cron job" で deploy 失敗する)。ここを cron スケジュールの SoT とする。
const crons = [
  { path: '/api/cron/refresh-matview', schedule: '0 3 * * *' },
  { path: '/api/cron/check-quota', schedule: '0 4 * * *' },
  { path: '/api/cron/export-revenue', schedule: '0 5 1 * *' },
];
const config = {
  version: 3,
  routes: [
    ...apiRouteRules, // catch-all グループを先に解決
    { handle: 'filesystem' }, // 単体関数 (health / identify-plant) + static 資産
    { src: '/(.*)', dest: '/index.html' }, // SPA フォールバック (クライアントルート)
  ],
  crons,
};
fs.writeFileSync(path.join(OUT, 'config.json'), JSON.stringify(config, null, 2));

console.log('[vercel-build] .vercel/output 生成完了');

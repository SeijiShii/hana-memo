#!/usr/bin/env bash
# 本番デプロイ (hana-memo)。
#
# ⚠️ 重要 (O51 の罠、2026-05-27 に prod で再発・解決):
#   `vercel build` を使ってはいけない。`vercel build` は buildCommand を実行した後に
#   さらに api/**/*.ts を **自前で auto-detect してコンパイル**し、.func の
#   .vc-config.json handler を生コンパイルした `api/<group>/[...path].js` に**上書き**する。
#   その生 .js は拡張子なし相対 import (`../_lib/router`) を持つため、本番関数で
#   ERR_MODULE_NOT_FOUND (500) になる (health.ts は import 無しなので 200 で気づきにくい)。
#   → 対策 = build script を **直接実行** (`node scripts/vercel-build.mjs`)。これは
#      各関数を esbuild で 1 ファイル bundle し handler=index.mjs の .vc-config を書く。
#      その後 `vercel deploy --prebuilt` で .vercel/output をそのまま deploy する。
#
# 使い方: bash scripts/deploy-prod.sh   (Class B = 本番公開。ユーザーが実行)
set -euo pipefail

echo "[1/3] クリーン (.vercel/output)"
rm -rf .vercel/output

echo "[2/3] build (node scripts/vercel-build.mjs を直接実行 — vercel build は使わない)"
node scripts/vercel-build.mjs

# handler が index.mjs (bundle) になっているか検証 — 生 .js なら O51 の罠
bad=$(grep -rl '"handler": "api/' .vercel/output/functions 2>/dev/null || true)
if [ -n "$bad" ]; then
  echo "❌ handler が raw .js を指しています (O51 の罠)。中断:"; echo "$bad"; exit 1
fi
echo "    ✅ 全 .func handler=index.mjs (bundle) を確認"

echo "[3/3] deploy --prebuilt --prod (Class B = 公開)"
vercel deploy --prebuilt --prod

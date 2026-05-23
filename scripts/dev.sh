#!/usr/bin/env bash
# hana-memo dev 起動スクリプト (concept §4.5.7 / perspectives O36)
# 動作確認用ワンショット起動: .env.local チェック → DB health → vercel dev → 起動後 smoke
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

PORT="${PORT:-3000}"
DEV_PID=""

cleanup() {
  echo ""
  echo "[dev.sh] 停止処理中..."
  if [[ -n "$DEV_PID" ]] && kill -0 "$DEV_PID" 2>/dev/null; then
    kill "$DEV_PID" 2>/dev/null || true
    wait "$DEV_PID" 2>/dev/null || true
  fi
  echo "[dev.sh] 停止完了 (Neon は cloud のため停止対象なし)"
}
trap cleanup INT TERM EXIT

# (1) .env.local 存在チェック
if [[ ! -f .env.local ]]; then
  echo "[dev.sh] ❌ .env.local がありません。次を実行してください:"
  echo "    cp .env.example .env.local && \$EDITOR .env.local"
  exit 1
fi
# health check 用に DATABASE_URL を読み込む
set -a
# shellcheck disable=SC1091
source .env.local
set +a

# (2) DB ping (health check)
echo "[dev.sh] Neon DB 接続確認..."
if command -v psql >/dev/null 2>&1; then
  if ! psql "${DATABASE_URL:-}" -c 'select 1' >/dev/null 2>&1; then
    echo "[dev.sh] ❌ DB 接続に失敗しました (DATABASE_URL を確認してください)"
    exit 1
  fi
  echo "[dev.sh] ✅ DB OK"
else
  echo "[dev.sh] ⚠️  psql が無いため DB ping をスキップ (任意: npm run db:studio で確認)"
fi

# (3) vercel dev 起動 (Vite frontend + Vercel Functions を 1 プロセス)
if command -v vercel >/dev/null 2>&1; then
  echo "[dev.sh] vercel dev を起動 (port $PORT)..."
  vercel dev --listen "$PORT" &
else
  echo "[dev.sh] ⚠️  vercel CLI 無し → vite のみ起動 (Functions/api は無効)"
  npm run dev -- --port "$PORT" &
fi
DEV_PID=$!

# 起動後 smoke (最大 30s リトライ)
echo "[dev.sh] smoke 確認 (最大 30s)..."
ok_root=0
ok_health=0
for _ in $(seq 1 30); do
  curl -fsS "http://localhost:$PORT/" >/dev/null 2>&1 && ok_root=1
  curl -fsS "http://localhost:$PORT/api/health" >/dev/null 2>&1 && ok_health=1
  [[ $ok_root -eq 1 && $ok_health -eq 1 ]] && break
  sleep 1
done
printf '[dev.sh] smoke: / = %s  /api/health = %s\n' \
  "$([[ $ok_root -eq 1 ]] && echo OK || echo NG)" \
  "$([[ $ok_health -eq 1 ]] && echo OK || echo 'NG (vite 単体時は未提供)')"
echo "[dev.sh] http://localhost:$PORT/ で動作確認できます (Ctrl+C で停止)"

wait "$DEV_PID"

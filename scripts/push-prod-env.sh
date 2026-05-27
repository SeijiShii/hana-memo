#!/usr/bin/env bash
# Vercel production env への一括投入 (.env.local 由来)。
# /flow:release Phase 3.1。秘密を prod infra に書くため**ユーザー自身が実行**する
# (harness の安全分類器が agent による bulk prod-secret 書込をブロックするため)。
#
# 使い方: bash scripts/push-prod-env.sh
#   - .env.local の各 var を `vercel env add <KEY> production` で投入
#   - deferred/prod 専用は skip: STRIPE_WEBHOOK_SECRET (webhook 登録後) / SENTRY_DSN /
#     VITE_SENTRY_DSN / CLERK_WEBHOOK_SIGNING_SECRET
#   - APP_BASE_URL は prod URL に上書き
#   - 値は末尾4文字のみ表示 (マスク)
set -euo pipefail

PROD_URL="https://hana-memo-quadiishii-9506s-projects.vercel.app"
SKIP="STRIPE_WEBHOOK_SECRET SENTRY_DSN VITE_SENTRY_DSN CLERK_WEBHOOK_SIGNING_SECRET"
ENV_FILE="${1:-.env.local}"

[ -f "$ENV_FILE" ] || { echo "❌ $ENV_FILE が見つかりません"; exit 1; }
command -v vercel >/dev/null || { echo "❌ vercel CLI が必要です"; exit 1; }

added=0; skipped=0; failed=0
while IFS='=' read -r k v; do
  [ -z "${k:-}" ] && continue
  case "$k" in \#*) continue ;; esac
  v=$(echo "$v" | sed -E 's/^"(.*)"$/\1/; s/^'\''(.*)'\''$/\1/')
  if echo "$SKIP" | grep -qw "$k"; then echo "  skip $k (後で設定)"; skipped=$((skipped+1)); continue; fi
  if [ -z "$v" ] || echo "$v" | grep -qiE "xxxx|replace|your-|changeme"; then
    echo "  skip $k (空/placeholder)"; skipped=$((skipped+1)); continue; fi
  [ "$k" = "APP_BASE_URL" ] && v="$PROD_URL"
  # 既存があれば一度削除 (再実行時の冪等性)。なければ無視。
  vercel env rm "$k" production -y >/dev/null 2>&1 || true
  if printf '%s' "$v" | vercel env add "$k" production >/dev/null 2>&1; then
    echo "  ✅ $k → production (…${v: -4})"; added=$((added+1))
  else
    echo "  ❌ $k 失敗"; failed=$((failed+1))
  fi
done < "$ENV_FILE"
echo "----"
echo "added=$added skipped=$skipped failed=$failed"
echo "次: vercel build  →  vercel deploy --prebuilt --prod"

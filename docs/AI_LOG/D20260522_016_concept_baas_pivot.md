# AI_LOG セッション D20260522_016 — /flow:concept (UPDATE: BaaS Pivot)

**実行日時**: 2026-05-22 17:40 (+09:00)
**コマンド**: /flow:concept (UPDATE モード、BaaS スタック方針変更に追随)
**対象**: 全プロジェクト (concept §4.2/§4.3/§5/§6/§10 + PREREQUISITES + 横断 5 + 機能 7 文書 retroactive update)
**状態**: 完了
**含まれる decision**: D20260522-114 〜 D20260522-119

## 主要決定サマリ
| ID | テーマ | 採用 |
|---|---|---|
| D20260522-114 | BaaS Pivot 採用 | charter §0 デフォルト (Neon + Vercel + Clerk + Cloudflare R2 + Drizzle) に全面切替 |
| D20260522-115 | Realtime 機能 | 廃止 → poll fallback で運用 (capture/notebook の状態更新通知は 5s poll) |
| D20260522-116 | Edge Function → Vercel Functions 移植 | identify-plant / stripe-webhook / export-revenue / check-quota を Vercel Functions (Node runtime) に |
| D20260522-117 | Auth = Clerk (Guest Users β + OAuth Linking) | Supabase Anonymous → Clerk Guest Users、users テーブル同期は Webhook で |
| D20260522-118 | Storage = Cloudflare R2 (S3 互換 + Presigned URL) | bucket-level RLS → Presigned URL TTL 制御で代替、エグレス無料を活用 |
| D20260522-119 | Update 範囲 | 横断 5 + concept + PREREQUISITES を full update、機能 7 文書は連携記述のみ minimum diff |

## 動機
- charter §0.2 が更新され、デフォルト技術前提が「Neon + Vercel + Clerk + R2 + Drizzle」に変更
- 理由: Supabase 無料プランは同時稼働プロジェクト 2 個まで → マイクロサービス連発 (seiji の方針) と不適合
- Neon は無料 10 DB 並立、Postgres 100% 互換、Clerk Guest Users (β) で匿名→OAuth Linking 設計を再現可能
- 撤退時の隔離も clean (perspectives O29 §4.7.5 整合): Neon DB 削除 + Clerk App 削除 + R2 Bucket 削除 + Vercel deploy 削除

## 影響分析 (Supabase → Neon スタック マッピング)
| 項目 | 旧 (Supabase) | 新 (Neon スタック) |
|---|---|---|
| DB | Supabase Postgres | **Neon Postgres** (無料 10 DB、auto-suspend) |
| マイグレーション | `supabase/migrations/*.sql` (SQL 生書き) | **Drizzle ORM + drizzle-kit** (`drizzle/migrations/*.sql` 自動生成) |
| RLS | Postgres RLS (`auth.uid() = user_id`) | **Drizzle クエリ層で user_id チェック** (Neon も Postgres RLS 使えるが Clerk uid を渡す手間あり、Drizzle 層が簡素) |
| Auth | Supabase Anonymous Auth + OAuth Linking | **Clerk Guest Users (β) + linkIdentity (Google OAuth)** |
| Storage | Supabase Storage (private bucket + signed URL) | **Cloudflare R2 (S3 互換) + AWS SDK S3 Presigned URL (60 分)** |
| Storage RLS | object-level RLS (`(storage.foldername)[1] = auth.uid()`) | **Vercel Function で user_id 検証 + Presigned URL 発行** (R2 自体には RLS なし) |
| Edge Functions | `supabase/functions/*` (Deno) | **Vercel Functions** (`api/*.ts`, Node 20 runtime) |
| Realtime | Supabase Realtime (PostgreSQL CDC) | **廃止、poll fallback** (5s ごと client fetch) |
| Cron | `pg_cron` | **Vercel Cron** (`vercel.json` で schedule、または GitHub Actions schedule) |
| Edge env | Supabase secrets | **Vercel env vars** (Production / Preview / Development) |
| Cost | Free tier (500MB DB / 1GB Storage / 50k MAU) | Free tier (Neon 0.5GB×10DB / Clerk 10k MAU / R2 10GB / Vercel Hobby) |

## Decisions

```yaml
- id: D20260522-114
  timestamp: 2026-05-22T17:40:00+09:00
  command: /flow:concept (UPDATE)
  phase: BaaS Pivot Q1
  question: BaaS スタックを charter §0 デフォルト (Neon + Vercel + Clerk + Cloudflare R2 + Drizzle) に切り替えるか?
  options:
    - "Neon スタックに全面切替 (recommended、charter §0 整合、マイクロサービス連発対応)"
    - "Supabase 維持 (hana-memo は最初の 1 個枠に収める)"
    - "部分切替 (DB だけ Neon、Auth/Storage は Supabase)"
  recommended: 案 1
  chosen: 案 1
  chosen_type: auto-recommended
  depends_on: [D20260522-011, D20260522-012, D20260522-022, D20260522-058]
  context: |
    charter §0.2 が seiji 指摘で更新 (Supabase 2 プロジェクト制約 → Neon 10 DB 並立)。
    hana-memo を charter デフォルトに揃え、今後のマイクロサービス連発に lockin 回避。
- id: D20260522-115
  timestamp: 2026-05-22T17:40:00+09:00
  command: /flow:concept (UPDATE)
  phase: Pivot 詳細 Q1
  question: Realtime (Supabase 固有機能) の代替
  options:
    - "廃止、poll fallback (5s ごと、recommended、シンプル)"
    - "Vercel Edge + WebSocket 自前 (over-engineering)"
    - "Cloudflare Durable Objects (新規依存)"
  recommended: 案 1
  chosen: 案 1
  chosen_type: auto-recommended
  context: capture の status=identifying → identified 通知は元々 poll fallback も用意していた (E-CA-008)。MVP は poll のみで十分。
- id: D20260522-116
  timestamp: 2026-05-22T17:40:00+09:00
  command: /flow:concept (UPDATE)
  phase: Pivot 詳細 Q2
  question: Edge Functions (Supabase Deno) の移植先
  options:
    - "Vercel Functions (Node 20、recommended、charter §0 整合 + フロントと同居)"
    - "Cloudflare Workers (新規依存、メリットなし)"
    - "Hono + Bun (新規依存)"
  recommended: 案 1
  chosen: 案 1
  chosen_type: auto-recommended
  context: |
    identify-plant / stripe-webhook / export-revenue / check-quota / purge-deleted-users を Vercel Functions に。
    OpenAI / Stripe / Resend SDK は Node 20 で動く。
    Vercel Cron で scheduled function (旧 pg_cron 置換) も可。
- id: D20260522-117
  timestamp: 2026-05-22T17:40:00+09:00
  command: /flow:concept (UPDATE)
  phase: Pivot 詳細 Q3
  question: Auth = Clerk の Guest Users / OAuth Linking 設計
  options:
    - "Clerk Guest Users (β) + linkIdentity for OAuth (recommended)"
    - "Lucia + 自前 anonymous (リファレンス少)"
    - "起動時から OAuth 強制 (charter §1.1 違反)"
  recommended: 案 1
  chosen: 案 1
  chosen_type: auto-recommended
  depends_on: [D20260522-022, D20260522-117]
  context: |
    Clerk Guest Users β は 2024 末から利用可、anonymous user → identity link で同 uid 維持。
    Webhook で users テーブル (Neon) 同期、deleted_at / linked_at / fingerprint_hash を Neon 側で管理。
    Guest user の trial 制限 (3 回) は Neon の users テーブルで管理 (前回設計同じ)。
- id: D20260522-118
  timestamp: 2026-05-22T17:40:00+09:00
  command: /flow:concept (UPDATE)
  phase: Pivot 詳細 Q4
  question: Storage = R2 の RLS 代替
  options:
    - "Vercel Function で user_id 検証 + Presigned URL 発行 60 分 (recommended)"
    - "R2 bucket policies で細かい制御 (R2 のサポート限定的)"
  recommended: 案 1
  chosen: 案 1
  chosen_type: auto-recommended
  context: |
    R2 は bucket-level RLS が無いため、Presigned URL の発行時に Vercel Function で user_id 検証。
    object path: `{user_id}/{discovery_id}/{image_id}.webp` (前回設計と同じ)。
    upload: Vercel Function `/api/storage/upload-url` で PUT presigned URL 発行 → client が直接 PUT。
    fetch: 同様に `/api/storage/signed-url` で GET presigned URL 発行。
- id: D20260522-119
  timestamp: 2026-05-22T17:40:00+09:00
  command: /flow:concept (UPDATE)
  phase: Pivot 詳細 Q5
  question: 14 文書の retroactive update 範囲
  options:
    - "横断 4 + concept + PREREQUISITES 中心 (recommended、最小整合)"
    - "全 14 文書を入念に retroactive (作業量大)"
    - "concept.md だけ + 次セッションへ後送 (整合性弱い)"
  recommended: 案 1
  chosen: 案 1
  chosen_type: auto-recommended
  context: |
    横断 5 (db/auth/storage/ai/analytics) SPEC + PLAN を全更新、機能 7 文書の §2.1 / §5.2 / §6 を minimum diff で連携先名称置換。
    詳細 API 名 (Drizzle schema / Clerk SDK / R2 SDK 等) は実装フェーズ dev-spec で詰める。
```

# CLAUDE.md — hana-memo プロジェクト設定

このファイルは Claude Code 起動時に自動 Read される。テスト環境 / コーディング規約 / プロジェクト固有のルールを記載。

## 概要

- **プロダクト**: 散歩中に出会った草花を撮るだけで AI が名前を当て、自分だけの植物発見ノートが育っていく PWA
- **詳細**: `docs/concept.md` 参照 (§1 プロダクト概要)
- **設計シナリオ**: `docs/SCENARIO.md` (現在 Phase 3 実装、_shared/db 着手中)

## スタック

- フロント: Vite + React + TypeScript + Tailwind + shadcn/ui + vite-plugin-pwa
- DB: Neon Postgres + Drizzle ORM + drizzle-kit
- 認証: Clerk (Guest Users β + Google OAuth Linking)
- Storage: Cloudflare R2 (S3 互換、Presigned URL)
- Functions: Vercel Functions (Node 20)
- AI: OpenAI gpt-4o-mini Vision (Vercel Function 経由)
- 課金: Stripe Checkout + Webhook
- 監視: Sentry (opt-in user のみ、beforeSend で PII scrub)
- Rate Limit: Upstash Ratelimit (Redis REST)

## テスト環境

- **テストフレームワーク**: Vitest 2.x
- **テスト実行コマンド**: `npm test` (one-shot) / `npm run test:watch` (watch) / `npm run test:coverage` (カバレッジ)
- **テストファイル配置**: `*.test.ts` を実装ファイルに co-locate (例: `src/shared/db/access.ts` ↔ `src/shared/db/access.test.ts`)
- **カバレッジ目標**: 行 80% / 分岐 70% (`vitest.config.ts` 参照)
- **DB 接続が必要なテスト**: Neon dev branch + `.env.local` の `DATABASE_URL` 必須、CI では mock を使う

## DB ワークフロー

- スキーマ変更: `src/shared/db/schema.ts` を編集 → `npm run db:generate` (migration SQL 生成) → `npm run db:migrate` (apply)
- dev branch: `neonctl branches create --name dev` で作成、`.env.local` に分岐 URL を設定
- studio: `npm run db:studio` で GUI

## コーディング規約

- TypeScript strict + noUnusedLocals + noUncheckedIndexedAccess
- import alias: `@/*` = `src/*`、`@shared/*` = `src/shared/*`
- Drizzle クエリは必ず `withUserScope` 経由 (認可ヘルパ、`src/shared/db/access.ts`)
- 秘密情報は `process.env.*` (Vercel Function only) / `import.meta.env.VITE_*` (frontend) に分離
- ハードコード secrets 禁止 (gitleaks / git-secrets 推奨)

## flow セット運用

- 設計ドキュメント: `docs/<feature>/{001-004,901-902}_*_*.md`
- 改修: `docs/<feature>/revise_<id>_<date>*/`
- バグ修正: `docs/<feature>/fix_<id>_<date>*/`
- 設計判断ログ: `docs/AI_LOG/D<date>_<sess>_*.md` (append-only)
- INDEX 自動更新: 各 flow コマンドが auto-generated 範囲を更新

## セキュリティ要件 (concept §3 NFR + secure findings 由来)

- [SEC-001] レート制限: 全 API endpoint に Upstash Ratelimit (10-100/min)
- [SEC-002] `.env.example` 完備 (本ファイル兄弟ファイル)
- [SEC-003] SSRF: AI Vision は `objectKey` のみ受領、`src/shared/helpers/url.ts` で guard
- [SEC-004] PII scrub: Sentry `beforeSend` + Slack 通知文を `src/shared/analytics/scrubber.ts` で scrub (法令必須)
- [SEC-005] 認可: 全 Drizzle クエリで `where user_id = ctx.userId` 強制 (`withUserScope` 経由)
- [SEC-006] Webhook idempotency: `webhook_dedupe` テーブル UNIQUE 制約でリプレイ拒否

## 関連リンク

- DOC_MAP: `docs/DOC_MAP.md`
- PREREQUISITES: `docs/PREREQUISITES.md`
- SCENARIO: `docs/SCENARIO.md`
- ESTIMATE: `docs/estimates/全体_20260523_hana-memo-mvp.md`

# 実装レポート: _shared/db

## 実装日時
2026-05-23 11:00 (JST)

## モード
feature (横断、対象=`_shared/db`)、連続実装モード起動 + Phase 0 (PJ bootstrap) 同梱

## 関連ドキュメント
- [001_db_SPEC.md](./001_db_SPEC.md) — 仕様書
- [002_db_PLAN.md](./002_db_PLAN.md) — 実装計画書
- [003_db_UNIT_TEST.md](./003_db_UNIT_TEST.md) — 単体テスト項目
- [102_db_UNIT_TEST_REPORT.md](./102_db_UNIT_TEST_REPORT.md) — 単体テストレポート
- [AI_LOG セッション](../../AI_LOG/D20260523_026_tdd__shared_db.md) — 設計判断ログ

## 注意事項
本レポートのファイルパスと行番号は実装日時時点のもの。以後の変更で行番号がずれる場合あり。

## 変更一覧

### Phase 0: PJ bootstrap (新規追加、PJ 未初期化のため必要)

- `package.json` 新規 (deps: `drizzle-orm@^0.36.4` / `@neondatabase/serverless@^0.10.4` / `pg@^8.13.1` / `drizzle-kit@^0.30.1` / `vitest@^2.1.8` / `tsx@^4.19.2` / `typescript@^5.7.2` + npm scripts: `dev` / `test` / `db:generate` / `db:migrate` / `db:seed`)
- `tsconfig.json` 新規 (strict + noUncheckedIndexedAccess + paths `@/* @shared/*` + ES2022 target)
- `drizzle.config.ts` 新規 (schema 参照、out=`./drizzle/migrations`)
- `vitest.config.ts` 新規 (v8 coverage + co-located `*.test.ts` + globals)
- `vercel.json` 新規 (Vite framework + Vercel Functions Node 20 + Cron 2 件)
- `.env.example` 新規 (全 20+ キー、[SEC-002] 同時消化、Upstash + Stripe + Clerk + R2 + Neon + Sentry + Slack + cost rates + 予算閾値)
- `CLAUDE.md` 新規 (テスト環境 + DB ワークフロー + コーディング規約 + flow セット運用 + secure 要件 [SEC-001〜006] 全件 reference)
- `.gitignore` 拡張 (drizzle / vitest-cache / coverage)

`npm install` 実行成功 (exit 0、node_modules/ 配下に 123 パッケージ展開)。

### Phase 1: schema + client + barrel
- `src/shared/db/schema.ts` 新規 (10 テーブル + 5 enum + Drizzle schema export)
  - `users` / `plants` / `images` / `discoveries` / `apiUsage` / `billingUnlocks` / `userSettings` / `consentLogs` / `discoveryEdits` / **`webhookDedupe`** ([SEC-006] revise sec_001-003 由来)
  - enum: `discovery_status` / `billing_type` / `location_precision` / `doc_type` / `edit_field`
  - index 7 件 (discoveries: 4、apiUsage: 2、webhookDedupe: 1)
- `src/shared/db/client.ts` 新規 (`db` neon-http シングルトン + `dbPool` node-postgres 遅延初期化)
- `src/shared/db/index.ts` 新規 (barrel export)

### Phase 2: access 制御 (軽 Phase、メイン直接)
- `src/shared/db/access.ts` 新規 (`withUserScope` + `assertOwner` + `AuthorizationError`)
- `src/shared/db/errors.ts` 新規 (`DbError` + `isUniqueViolation` + `isCheckViolation`、E-DB-001〜005 対応)

### Phase 3: SQL migrations (軽 Phase)
- `drizzle/migrations/0001_api_usage_monthly_matview.sql` 新規 (matview + 2 index、CONCURRENTLY REFRESH 対応)
- `drizzle/migrations/0002_append_only_triggers.sql` 新規 (`billing_unlocks` / `consent_logs` / `discovery_edits` UPDATE/DELETE 禁止トリガ + CHECK 制約 `ai_credits_remaining ≥ 0` / `trial_used_count ≥ 0` / `amount_jpy > 0`)
- `0000_initial_schema.sql` (drizzle-kit 自動生成想定): **未実行** (DB 接続必須、deploy 時に `npm run db:generate` で生成)

### Phase 4: seed (軽 Phase)
- `src/shared/db/seed.ts` 新規 (ダミー users 2 + user_settings 2 + discoveries 3)

### テスト (UNIT_TEST)
- `src/shared/db/access.test.ts` 新規 (12 ケース、認可ネガティブ含む [SEC-005])
- `src/shared/db/errors.test.ts` 新規 (9 ケース)
- `src/shared/db/schema.test.ts` 新規 (7 ケース、Drizzle メタデータ smoke)

## 実装計画からの差分

| 項目 | 内容 |
|---|---|
| 計画にない追加変更 | (1) Phase 0 (PJ bootstrap) を追加: PJ 未初期化のため package.json + tsconfig 等を作成<br>(2) `webhookDedupe` テーブル: revise sec_001-003 設計反映の一環で initial schema に同梱 (002_db_PLAN.md は revise 前の仕様、本実装でマージ済)<br>(3) `.env.example` 作成 ([SEC-002] open + TDD-handoff の同時消化) |
| 計画から省略した変更 | (1) `0000_initial_schema.sql` を **手動生成せず**: drizzle-kit が DB 接続前提のため、deploy 時に `npm run db:generate` で自動生成する設計に切替 (002_db_PLAN.md §1.2 の文言は「initial 一括」だが、実用面で deploy 時生成が標準)<br>(2) Neon main branch apply: 本セッションは DB 接続を保有しないため、deploy 担当者が `npm run db:migrate` を実行する想定 |
| 想定外の問題と対処 | esbuild が schema.ts JSDoc top-level コメント内の `§` を構文エラー扱い → JSDoc から通常コメント `//` に変換して回避 (機能影響なし) |

## PR Description

### タイトル
_shared/db: Drizzle schema + access helpers + PJ bootstrap

### 概要
hana-memo MVP の DB 基盤 (Drizzle schema 10 テーブル + access 制御ヘルパ + SQL migrations + seed) を実装。同時に PJ 全体の bootstrap (package.json / tsconfig / vitest / drizzle 設定 / .env.example / CLAUDE.md) を完了。Vitest 28 テスト全 pass。

### 変更内容
- **Phase 0** (PJ bootstrap): package.json + tsconfig.json + drizzle.config.ts + vitest.config.ts + vercel.json + .env.example + CLAUDE.md
- **Phase 1** (schema): 10 テーブル (users / plants / discoveries / images / api_usage / billing_unlocks / user_settings / consent_logs / discovery_edits / **webhook_dedupe** [SEC-006]) + 5 enum + 7 index + client.ts + index.ts
- **Phase 2** (access): `withUserScope` + `assertOwner` + `AuthorizationError` + `DbError`
- **Phase 3** (SQL migrations): matview (api_usage_monthly) + append-only triggers (billing/consent/edits) + CHECK 制約
- **Phase 4** (seed): dev 環境用ダミーデータ

### テスト
- vitest: 28 ケース、全 pass (access 12 + errors 9 + schema 7)
- 認可ネガティブテスト ([SEC-005] 対応): assertOwner で他人 userId → AuthorizationError throw を 4 ケース確認
- DB 接続テスト: deploy 後に `npm run db:migrate` 適用 + Drizzle Studio で目視確認が必要 (本セッション範囲外)

### secure findings 連動

| ID | severity | 対応 |
|---|---|---|
| [SEC-002] `.env.example` (Critical) | Critical | ✅ **closed**: `.env.example` 全 20+ キー作成完了 |
| [SEC-005] Drizzle 認可ネガティブテスト | Medium | ✅ **解消**: access.test.ts §UT-DB-AUTH-* 4 件で他人 uid → AuthorizationError 確認 |
| [SEC-006] Webhook idempotency | Medium | ✅ **解消**: `webhookDedupe` テーブル新規追加、UNIQUE 制約で重複拒否 |

→ concept §8 の status 更新 (本 commit 内で実施): SEC-002 = closed、SEC-005/006 = 注記更新

## 次のステップ

1. `_shared/types` 実装 (本 schema から `InferSelectModel` / `InferInsertModel` を re-export)
2. `_shared/helpers` 実装 (date / image / location / hash / **url ([SEC-003] 由来)**)
3. `_shared/analytics` 実装 (Sentry beforeSend + scrubber [SEC-004] 由来 + cost.ts + check-quota)
4. `_shared/auth` 実装 (Clerk SDK + fingerprint + linkIdentity + Webhook)
5. `_shared/storage` 実装 (R2 Presigned URL + validateObjectKey)
6. `_shared/ai` 実装 (OpenAI Vision + ratelimit [SEC-001] + SSRF guard [SEC-003])
7. 機能 7 件実装 (account / capture / notebook / billing / export / memory / legal)

連続実装モードを継続するには `/flow:tdd` を新セッションで起動 (現セッション context は ~350K+ tokens、ここで区切りを推奨)。

## 補足: deploy 担当者向け手順

```bash
# 1. dev branch 作成 (Neon dashboard or CLI)
neonctl branches create --name dev

# 2. .env.local に dev branch DATABASE_URL を設定
cp .env.example .env.local
# DATABASE_URL を編集

# 3. drizzle-kit で initial schema migration を生成
npm run db:generate
# → drizzle/migrations/0000_*.sql が生成される

# 4. dev branch に apply
npm run db:migrate

# 5. 手書き SQL migration を apply (psql で直接実行)
psql $DATABASE_URL -f drizzle/migrations/0001_api_usage_monthly_matview.sql
psql $DATABASE_URL -f drizzle/migrations/0002_append_only_triggers.sql

# 6. seed 投入
npm run db:seed

# 7. Drizzle Studio で目視確認
npm run db:studio
```

## 更新履歴

| 日付 | 変更概要 | 実行者 |
|---|---|---|
| 2026-05-23 | 初版作成 (`/flow:tdd _shared/db` 連続実装モード、Phase 0-4 完遂) | /flow:tdd |

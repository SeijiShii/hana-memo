# 実装レポート: _shared/auth (SDK 非依存コア)

## 実装日時
2026-05-23 17:48 (JST)

## モード
feature — **SDK 非依存のテスト可能コアのみ実装**。React/Clerk/Vercel/fingerprint glue は app/api bootstrap フェーズへ defer (ユーザー承認の decouple 方針)。

## 関連ドキュメント
- [001_auth_SPEC.md](./001_auth_SPEC.md) / [002_auth_PLAN.md](./002_auth_PLAN.md) / [003_auth_UNIT_TEST.md](./003_auth_UNIT_TEST.md)
- [902_auth_IMPL_SECURITY_CHECKLIST.md](./902_auth_IMPL_SECURITY_CHECKLIST.md)
- [AI_LOG](../../AI_LOG/D20260523_030_tdd__shared_auth.md)

## 変更一覧

### 実装 (純ロジック + DI)
- `src/shared/auth/errors.ts` (新規): `LinkRequiredError` / `AuthInitError` (cause override) / `OAuthCallbackError` (code 付き)。
- `src/shared/auth/trial.ts` (新規): `checkTrialQuota` (匿名=ANON_TRIAL_MAX=3 / OAuth=Infinity) + `enforceTrialLimit` (超過で LinkRequiredError)。SPAM 抑止コア ([論点-006])。
- `src/shared/auth/rls.ts` (新規): `assertOwnUser` (current≠target で RLS violation throw、[SEC-005] アプリ層認可)。
- `src/shared/auth/webhook.ts` (新規): `mapClerkWebhookEvent` (created/updated→upsert、deleted→softDelete、純) + `applyUserSync` (UserSyncStore DI、linkedAt は非匿名のみ now、[SEC-006] idempotency-adjacent)。
- `src/shared/auth/index.ts` (新規): barrel。

## 実装計画からの差分

| 項目 | 内容 |
|------|------|
| 計画にない追加変更 | trial / webhook 判定を純関数 + DI store に切り出し (PLAN は Clerk SDK 直結前提だったが SDK 非依存化)。 |
| 計画から省略した変更 | **defer (app/api bootstrap)**: `provider.tsx` / `guest-session.ts` / `link.ts` / `hooks.ts` (React + @clerk/clerk-react)、`getFingerprint` (@fingerprintjs)、`api/clerk-webhook.ts` (svix 署名検証 + drizzle upsert)、`api/auth/spam-check.ts` / `api/_lib/clerk.ts` (@clerk/backend)。理由: React/SDK 未インストール + vitest=node 環境。これらが消費する trial 判定 / webhook mapping / 認可は本コアで testable に先行実装済。 |
| 想定外の問題と対処 | webhook の linkedAt timestamp を純関数から排し、`applyUserSync(op, store, now)` で注入 (テスト deterministic 化)。 |

## PR Description

### タイトル
_shared/auth: SDK 非依存コア (trial 抑止 + 認可 + Clerk webhook mapping)

### 概要
認証基盤のうち SDK に依存しないドメインロジック (SPAM trial 抑止、アプリ層認可、Clerk webhook → users 同期 mapping、例外型) を実装。React/Clerk/Vercel の実 wiring は app/api bootstrap フェーズへ。

### 変更内容
- 例外型 3 種、trial クォータ判定、assertOwnUser、Clerk webhook event mapping + DI 適用

### テスト
- 25 tests pass、auth 行 99.06% / 分岐 97.05% (errors/trial/rls/webhook 100%)
- 全体 194/194 pass、typecheck clean

---

## Milestone B 追記: SDK glue wiring (2026-05-24, D20260524_049 /flow:auto 反復 6)

Phase 3.5 (app/api bootstrap) で defer していた Clerk / fingerprint / Vercel Function glue を実装。
SDK install: `@clerk/clerk-react@^5.61.7` / `@clerk/backend@^3.4.13` / `svix@^1.94.0` /
`@fingerprintjs/fingerprintjs@^5.2.0` + テスト基盤 `happy-dom` / `@testing-library/react`。

### 追加実装ファイル

| ファイル | 責務 | テスト |
|---|---|---|
| `src/shared/auth/provider.tsx` | `<AuthProvider>` = ClerkProvider wrapper + publishableKey ガード | provider.test.tsx (happy-dom, 2) |
| `src/shared/auth/guest-session.ts` | `ensureGuestSession` (single-flight lock + retry1 + AuthInitError) | guest-session.test.ts (6) |
| `src/shared/auth/link.ts` | `linkWithGoogle` / `isLinked` / `getIdentities` / callback URL・state 検証 | link.test.ts (10) |
| `src/shared/auth/spam-guard.ts` | `getFingerprint` (+弱 fallback) / `enforceTrialLimitRemote` | spam-guard.test.ts (6) |
| `src/shared/auth/hooks.ts` | `useCurrentUser` / `useClerkUserId` (Clerk → ドメイン形) | hooks.test.tsx (happy-dom, 5) |
| `api/_lib/clerk.ts` | `verifyClerkSession` (@clerk/backend verifyToken) + Bearer 抽出 | clerk.test.ts (6) |
| `api/clerk-webhook.ts` | svix 検証 → `mapClerkWebhookEvent`/`applyUserSync` → drizzle upsert | clerk-webhook.test.ts (5) |
| `api/auth/spam-check.ts` | `verifyClerkSession` + `checkTrialQuota` + fingerprint hard cap | spam-check.test.ts (6) |

### 設計判断 / 既知の差分

- **decouple 維持**: テスト可能なオーケストレーション/評価ロジック (`ensureGuestSession` /
  `processClerkWebhook` / `evaluateSpamCheck` / link 純関数) を SDK 非依存で切り出し、Clerk β
  呼出 (guest sign-in) と DB 接続は注入/遅延 import。Clerk Guest Users β の client API は
  検証不能のため `signInAsGuest` を注入境界に置いた (実 wiring + E2E は Milestone C)。
- **UNIT_TEST 計画の Supabase 残渣**: `003_auth_UNIT_TEST.md` は BaaS Pivot 前の
  `session.ts`/`linkIdentity` 表現が残存。実装は `001/002` (Clerk) 準拠とし、テスト ID は
  L01-L08 / G01-G08 / S01-S03 / E01-E02 へマッピング。
- **api Web handler**: `@vercel/node` 削除済のため `(req: Request) => Response` の Web 形式 +
  `export const config = { runtime: 'nodejs' }`。
- **fingerprint hard cap (G08)**: 評価ロジックは実装・テスト済だが、fingerprint 永続化テーブルが
  未導入のため `countUsersByFingerprint` は現状 0 を返すスタブ ([論点-006] follow-up、要スキーマ追加)。
- **SEC-001/SEC-004 closure 進捗**: 本 wiring は auth glue。rate-limit (SEC-001) は ai api、
  Sentry beforeSend (SEC-004) は analytics api の Milestone B 残タスク。

### テスト (Milestone B 時点)
- 全体 **419/419 pass** (auth/api 新規 46)、typecheck 0、eslint 0、prettier 整形済
- auth 行 96.46% / 分岐 90.98%、api handler は default export wiring を除き純ロジック 100%

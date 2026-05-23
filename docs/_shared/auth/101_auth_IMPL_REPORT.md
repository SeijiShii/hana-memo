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

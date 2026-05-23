# D20260523_030 — /flow:tdd _shared/auth (SDK 非依存テスト可能コア)

```yaml
session_id: D20260523_030_tdd__shared_auth
command: /flow:tdd
mode: feature (SDK 非依存コアのみ実装、React/Clerk/Vercel glue は defer)
target: _shared/auth
started_at: 2026-05-23T17:45:00+09:00
last_updated: 2026-05-23T17:48:00+09:00
状態: 完了 (SDK 非依存コア)
完了ステップ一覧: [Step 1-4 判定, Step 5 実装, Step 6 全テスト, Step 7 レポート, Step 9 INDEX, Step 10 整合性, Step Z commit]
依存セッション: [D20260523_028_auto_continuous, D20260522_007_feature__shared_auth]
dispatched_by: /flow:auto (continuous loop iteration 2)
user_decision: 「SDK 非依存で実装」(継続、injectable パターン)
```

---

## Step 1-4: スコープ + 軽重判定

`_shared/auth` は React/Clerk/Vercel に強く結合。React 自体も未インストール (vitest は `environment: node`)。
ユーザー承認の decouple 方針に従い、**SDK 非依存のテスト可能コアのみ実装**:

### 実装 (今回、純ロジック + DI)
| ファイル | 責務 | 対応テスト |
|---|---|---|
| `errors.ts` | LinkRequiredError / AuthInitError / OAuthCallbackError | UT-AU-R03 |
| `trial.ts` | checkTrialQuota / enforceTrialLimit + ANON_TRIAL_MAX (SPAM 抑止コア) | UT-AU-G03〜G07 |
| `rls.ts` | assertOwnUser (認可、[SEC-005]) | UT-AU-R01〜R02 |
| `webhook.ts` | mapClerkWebhookEvent (event→DB-op、純) + applyUserSync (UserSyncStore DI、[SEC-006] idempotency) | (新規追加) |
| `index.ts` | barrel | |

### Defer (app/api bootstrap フェーズ、SDK 必要)
- `provider.tsx` / `guest-session.ts` / `link.ts` / `hooks.ts` (React + @clerk/clerk-react、jsdom + @testing-library/react)
- `getFingerprint` (@fingerprintjs/fingerprintjs + browser)
- `api/clerk-webhook.ts` (svix 署名検証 + drizzle upsert) / `api/auth/spam-check.ts` / `api/_lib/clerk.ts` (@clerk/backend)
- 上記が消費する trial 判定 / webhook event mapping / 認可は本コアで testable に先行実装済

---

## decisions

### D20260523-091 — Step 1 スコープ (auth decouple)

- **chosen_type**: explicit-choice (ユーザー「SDK 非依存で実装」)
- **chosen**: 純ロジック + DI コア (errors/trial/rls/webhook) を実装、React/Clerk/Vercel/fingerprint glue は app/api bootstrap へ defer
- **context**: auth は frontend/SDK 結合が大半。React 未インストール + node 環境。テスト可能なドメインロジック (trial SPAM 抑止 / 認可 / webhook idempotency mapping) を切り出して先行実装

### D20260523-092 — Step 6 全テスト結果

- **chosen_type**: auto-recommended
- **chosen**: 25 tests pass、全体 194/194 pass、typecheck clean
- **context**: auth 行 99.06% / 分岐 97.05% (errors/trial/rls/webhook 100%)

---

## 生成・更新アーティファクト
- 実コード: `src/shared/auth/{errors,trial,rls,webhook,index}.ts` (5 新規) + test (3 新規、25 tests)
- レポート: `101_auth_IMPL_REPORT.md` / `102_auth_UNIT_TEST_REPORT.md`
- INDEX: `_shared/auth/INDEX.md` / `docs/INDEX.md` → コア実装完了
- SCENARIO §5: Phase 3 進行更新 (auth コア)

## 学習・改善
- frontend/SDK 結合の重い横断モジュールでは「純ドメインロジック + DI を先行実装、SDK/React glue は app bootstrap へ defer」が有効。analytics の Sentry injectable と同型パターン

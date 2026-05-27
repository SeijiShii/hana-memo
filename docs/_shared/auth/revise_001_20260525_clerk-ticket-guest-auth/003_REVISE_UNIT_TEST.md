# _shared/auth 単体テスト計画（匿名サインインを Clerk ticket 方式で実装可能化）

> **入力**: `./001_REVISE_SPEC.md`, `./002_REVISE_PLAN.md`, 既存 `guest-session.test.ts` / `spam-check` 系
> **最終更新**: 2026-05-25
> **テスト環境**: Vitest + happy-dom (React)、SDK/DB/fetch は全注入で mock

---

## 1. 追加テストケース

### 1.1 正常系
| ID | 対象 | 入力 | 期待出力 |
|---|---|---|---|
| UT-AU-GP01 | `provisionGuest` | createUser→{id} / upsert ok / createSignInToken→{token} | `{ ticket: token }`、createUser→upsert→token の順で呼ばれる |
| UT-AU-GP02 | `provisionGuest` | createUser に `externalId`(UUID) + `publicMetadata.isAnonymous=true` 付与 | createUser 引数に identifier が含まれる ([論点-002]) |
| UT-AU-GC01 | `fetchGuestTicket` | fetch→200 `{ticket:'t'}` | `'t'` を返す。`POST /api/auth/guest`、body に fingerprint |
| UT-AU-US01 | `useGuestSession` | isSignedIn=false、fetchTicket→'t'、signIn.create→{createdSessionId}、setActive ok | signIn.create が `{strategy:'ticket',ticket:'t'}` で呼ばれ setActive(createdSessionId) |
| UT-AU-US02 | `useGuestSession` | isSignedIn=true | no-op (ticket fetch も sign-in もしない) |
| UT-AU-GT01 | `GuestSessionGate` | key あり, isLoaded && !isSignedIn | mount 時に 1 度だけ ensureGuestSession 駆動 |

### 1.2 異常系
| ID | 対象 | 失敗条件 | 期待振る舞い |
|---|---|---|---|
| UT-AU-GP03 | `provisionGuest` | limiter.success=false | 429 相当 (`RateLimitedError`)、createUser 呼ばれない |
| UT-AU-GP04 | `provisionGuest` | createUser throw | 503 相当 (`GuestProvisionError`)、token 呼ばれない |
| UT-AU-GP05 | `provisionGuest` | fingerprint cap 到達 (count>=cap) | 429 + mustLink |
| UT-AU-GC02 | `fetchGuestTicket` | fetch→429 | `RateLimitedError` を throw (リトライ可判定) |
| UT-AU-GC03 | `fetchGuestTicket` | fetch→503 / ネットワーク | 正規化エラー throw |
| UT-AU-US03 | `useGuestSession` | fetchTicket throw → ensureGuestSession retry 後も失敗 | status='error' / AuthInitError 伝播 (E-AU-001) |
| UT-AU-GUARD | `api/auth/guest` handler | method≠POST | 405 |

### 1.3 境界値
| ID | 対象 | 境界 | 期待振る舞い |
|---|---|---|---|
| UT-AU-US04 | boot single-flight | StrictMode 二重 mount / 並列 | ensureGuestSession の inflight lock で createUser 1 回のみ (既存 UT-AU-E01 lock を ticket 経路で再確認) |

## 2. 修正テストケース

| ID | 対象 | 修正前 | 修正後 | 理由 |
|---|---|---|---|---|
| (既存) `guest-session.test.ts` UT-AU-S01〜E01 | `signInAsGuest` を generic mock fn で注入 | **変更不要** (注入契約不変、ticket 実体は別ファイルでテスト) | `ensureGuestSession` は中身に非依存 |

## 3. 削除テストケース
| ID | 対象 | 削除理由 |
|---|---|---|
| (なし) | — | 既存テストは全維持 |

## 4. リグレッション強化
- `api/_handler-contract.test.ts` が新 `api/auth/guest.ts` の `{fetch}` export 形を自動検査 (D20260525_058 由来)。
- keyless 起動の graceful (AppAuthProvider) 既存テストが Gate 追加後も white-screen しないこと。
- 既存 `useAuthToken` / `useCurrentUser` テスト (env stub) が不変で green。

## 5. Mock 方針差分
| 対象 | 前回 | 今回 | 理由 |
|---|---|---|---|
| Clerk backend | verifyToken のみ mock | + `users.createUser` / `signInTokens.createSignInToken` を注入 mock | 新 endpoint |
| Clerk react | useAuth/useUser mock | + `useSignIn` (signIn.create/setActive) mock | ticket sign-in |
| fetch | — | `fetchGuestTicket` に fetch 注入 | endpoint 呼び |

## 6. カバレッジ目標
| 種別 | 目標 | 根拠 |
|---|---|---|
| 行 | 80% | 既存継承 (vitest.config) |
| 分岐 | 70% | 新規 endpoint の 429/503/cap 分岐を網羅 |

## 7. 更新履歴
| 日付 | 変更概要 | 実行者 |
|---|---|---|
| 2026-05-25 | 初版作成 | /flow:revise |

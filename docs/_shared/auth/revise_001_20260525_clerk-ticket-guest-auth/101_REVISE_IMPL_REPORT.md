# 実装レポート: _shared/auth revise_001 (匿名サインイン Clerk ticket 方式)

## 実装日時
2026-05-25 18:55 (JST)

## モード
revise

## 関連ドキュメント
- [001_REVISE_SPEC.md](./001_REVISE_SPEC.md) / [002_REVISE_PLAN.md](./002_REVISE_PLAN.md) / [003_REVISE_UNIT_TEST.md](./003_REVISE_UNIT_TEST.md)
- [AI_LOG D20260525_060](../../AI_LOG/D20260525_060_revise__shared_auth_001.md) / [D20260525_061 (tdd)](../../AI_LOG/D20260525_061_tdd__shared_auth_revise_001.md)

## 注意事項
本レポートのファイルパスは実装日時時点のもの。

## 変更一覧

### Phase 1: バックエンド匿名発行コア + endpoint
- 新規 `api/auth/_lib/guest-provision.ts`: `provisionGuest(input, deps)` 純オーケストレーション。`checkRateLimit`→(任意 fingerprint cap)→`createUser`(externalId+publicMetadata.isAnonymous)→`upsertUser`→`createSignInToken` の順。失敗を `GuestRateLimitedError`(429)/`GuestProvisionError`(503) にマップ。SDK/DB は全注入。
- 新規 `api/auth/guest.ts`: `{fetch:handler}` 形 (handler-contract 準拠)。`@clerk/backend` `createClerkClient` + db + `createGuestRateLimiter` を dynamic import で隔離し provisionGuest に注入。`guestRateKey`/`clientIpFrom` は純関数で別途テスト。CLERK_SECRET_KEY 不在は 503。
- 変更 `api/_lib/ratelimit.ts`: `GUEST_RATE_LIMIT`(10/10min) + `createGuestRateLimiter` (prefix `ratelimit:guest`) 追加。

### Phase 2: フロント ticket sign-in アダプタ
- 新規 `src/shared/auth/guest-client.ts`: `fetchGuestTicket(fetch, {fingerprint})` (429→`GuestTicketRateLimitedError` / 他→`GuestTicketError`) + `buildGuestSignIn(primitives)` が ticket 取得→`signInCreate({strategy:'ticket'})`→`setActive(sessionId)` を `GuestSignInFn` に組成。SDK 非依存。
- 新規 `src/shared/auth/useGuestSession.ts`: `useSignIn`(Clerk) + `useAuthSnapshot` を結線し、未 sign-in 時に `ensureGuestSession` 経由で 1 度だけ駆動。opts は ref 安定化、失敗は terminal(`status:'error'`、ensureGuestSession 内で 1 retry 済)。

### Phase 3: boot 配線
- 新規 `src/shared/auth/GuestSessionGate.tsx`: `useGuestSession({getFingerprint})` を呼ぶ無描画ゲート、error 時のみ fatal 通知 (role=alert, E-AU-001)。
- 変更 `src/app/AppAuthProvider.tsx`: ClerkAuthBridge 内に `<GuestSessionGate/>` をマウント (Clerk hooks 利用可 + AuthSnapshot 読取可、keyless では従来 no-op)。

## 実装計画からの差分

| 項目 | 内容 |
|---|---|
| 計画にない追加変更 | `api/auth/guest.test.ts` で純関数 `guestRateKey`/`clientIpFrom` を分離テスト。AppAuthProvider.test.tsx の clerk mock に `useSignIn`(isLoaded:false) を追加 (Gate 追加に伴う回帰修正) |
| 計画から省略した変更 | `index.ts` barrel への `useGuestSession`/`GuestSessionGate` export は**見送り** — barrel は React/Clerk 依存ファイルを含めない既存規約のため、AppAuthProvider が直接 import (規約整合) |
| 想定外の問題と対処 | useGuestSession の `opts` を effect deps に入れて `started=false` 再設定したことで error 時にオシレーション (signing-in↔error)。opts を ref 安定化 + error を terminal にして解消 (useGuestSession.test UT-AU-US03 で検出) |

## PR Description

### タイトル
_shared/auth: 匿名サインインを Clerk ticket 方式で実装 (Guest β は実在せず)

### 概要
起動時の自動匿名サインイン (concept §4「0 タップ認証」) を、実在しない Clerk Guest Users β に代えて backend `createUser`+`signInToken` ticket 方式で実装。これまで session が成立せず保存/図鑑取得が全 skip されていた core flow を機能させる。

### 変更内容
- backend: `api/auth/guest.ts` (匿名 user 発行 + ticket) + `provisionGuest` 純コア + guest レート制限
- frontend: `guest-client` (ticket fetch + signIn 組成) + `useGuestSession` hook + `GuestSessionGate` boot 配線
- DB スキーマ変更なし、MIGRATION なし (α 未公開)

### テスト
- 新規 29 ユニット (provisionGuest 8 / guest handler 純関数 5 / guest-client 7 / useGuestSession 4 / GuestSessionGate 4 + handler-contract +1)
- 全体: 890→**919 green**、typecheck 0、eslint 0
- runtime (実 Clerk) 検証は Phase 4 (vercel dev 目視) — [論点-002] createUser identifier 要件を実 API で確定

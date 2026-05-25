# _shared/auth 変更仕様書（匿名サインインを Clerk ticket 方式で実装可能化）

> **改修種別**: 機能変更 (実装不能な前提の置換)
> **issue / slug**: 001 / clerk-ticket-guest-auth
> **基準 SPEC**: `../001_auth_SPEC.md`
> **最終更新**: 2026-05-25
> **タグ**: cross-cutting / auth / 基盤 / auth-required

---

## 1. 変更概要

concept §4 のコア UX「起動時に自動で匿名サインイン → サインアップ不要で撮影・保存」を実現する手段を、**実在しない `Clerk Guest Users β / signInAsGuest`** から、**Clerk-native な「バックエンド匿名ユーザー発行 + sign-in ticket」方式**へ置換する。フロント・バックエンドの認証境界 (JWT 検証 / userId スコープ / OAuth 後リンク) は不変で、「匿名 session をどう発生させるか」だけを差し替える。

## 2. 変更前 vs 変更後

### 2.1 UC 変更
| UC ID | 変更前 | 変更後 | 理由 |
|---|---|---|---|
| 起動時匿名認証 | `useGuestSession()` が Clerk の `signInAsGuest` (Guest Users β) を呼んで匿名 session を確立 | `useGuestSession()` が `/api/auth/guest` から sign-in ticket を取得し `signIn.create({strategy:'ticket'})` + `setActive` で匿名 session を確立 | `signInAsGuest` / Guest Users β は Clerk に実在しない |
| OAuth 後リンク | 変更なし (匿名 user に Google を linkIdentity、同 uid 維持) | 変更なし | 匿名 user が「実在する Clerk user」になったことで linkIdentity がむしろ素直に機能 |

### 2.2 入出力変更
| 対象 | 変更前 | 変更後 | 互換性 |
|---|---|---|---|
| `useGuestSession()` hook | Clerk `signInAsGuest` を注入 (実体なし) | 内部で `/api/auth/guest` POST → ticket → `useSignIn().signIn.create({strategy:'ticket', ticket})` → `setActive` | 互換 (公開シグネチャ `() => void` 起動 effect は不変) |
| `ensureGuestSession({isSignedIn, signInAsGuest})` | 既存純関数 (single-flight + retry) | **不変** (`signInAsGuest` は引き続き注入。中身が ticket 方式になるだけ) | 完全互換 |
| **新規** `POST /api/auth/guest` | (なし) | req: `{ fingerprint?: string }` (任意) / res: `{ ticket: string }` (200) or `{ error }` (429/503) | 新規追加 |
| Neon `users` 行 | clerk-webhook 経由でのみ作成 | `/api/auth/guest` が createUser 後に **直接 upsert** (isAnonymous=true, trial_used_count=0)。webhook は更新/削除のフォールバックとして維持 | 互換 (webhook 経路は残す) |

### 2.3 データモデル変更
| エンティティ | 変更内容 | マイグレーション要否 |
|---|---|---|
| `_shared/db/users` | 変更なし (`clerk_user_id` unique / `is_anonymous` default true / `trial_used_count` 既存で充足) | **不要** |

### 2.4 バリデーション・エラー変更
| 対象 | 変更前 | 変更後 |
|---|---|---|
| E-AU-001 | 「Clerk Guest sign-in 失敗」 | 「匿名 session 確立失敗 (`/api/auth/guest` 5xx / ticket sign-in 失敗 / レート超過)」。retry 1 回後 fatal モーダル (文言不変) |
| `/api/auth/guest` | (なし) | レート超過 → 429、Clerk createUser/token 失敗 → 503。fingerprint hard cap 到達 (将来) → 429+mustLink |

## 3. 影響範囲

| 対象 | 影響度 | 説明 |
|---|---|---|
| `_shared/auth` (本体) | 高 | `useGuestSession` 新規実装 + boot driver + 新 endpoint |
| `api/` (Vercel Function) | 高 | `api/auth/guest.ts` 新規 (createUser + signInToken + users upsert) |
| `capture` / `notebook` / 全認証必須機能 | 高 (間接) | 匿名 session が成立して初めて save/fetch が実行される (現状ブロックの解消) |
| `_shared/db/users` | 低 | スキーマ不変、upsert 経路追加のみ |
| concept §4 / 基準 SPEC §1.1 | 中 | 「Clerk Guest Users β」誤記の整合修正 (§9 未決-001) |

## 4. 後方互換性

- **互換維持**: ✅ (公開 API・JWT 契約・userId スコープすべて不変)
- α 未公開で **本番ユーザー・本番データなし** → 移行不要。匿名 session 生成手段の置換のみで、既存の認証境界には非互換変更なし。

## 5. ロールバック方針

- **コード revert で戻せる**: ✅ (DB 変更なし、フィーチャーフラグ不要)
- 新 endpoint + hook の追加とその配線のみ。revert で元の「匿名 session 未成立 (keyless 相当)」状態に戻る。

## 6. リリース戦略

- **方式**: 一括 (α 未公開、ユーザー影響なし)
- ロールアウト: ローカル `vercel dev` で実フロー目視 (release Phase 2 再検証) → preview deploy → prod。

## 7. 詳細仕様（新仕様）

### 7.1 詳細 UC（新仕様）
**UC: 起動時匿名サインイン**
1. アプリ起動、Clerk `isLoaded=true && isSignedIn=false` を検知 (boot driver)。
2. `getFingerprint()` (任意) を付して `POST /api/auth/guest`。
3. バックエンド: レート制限 + spam-guard 通過 → `clerkClient.users.createUser({ externalId: <uuid> , publicMetadata:{ isAnonymous:true } })` (Clerk は identifier 必須のため生成 `externalId`/`username` を付与) → Neon `users` upsert (clerk_user_id, is_anonymous=true) → `clerkClient.signInTokens.createSignInToken({ userId, expiresInSeconds:600 })` → `{ ticket }` 返却。
4. フロント: `useSignIn().signIn.create({ strategy:'ticket', ticket })` → `setActive({ session: createdSessionId })`。
5. `ClerkAuthBridge` が `isSignedIn=true / userId` を AuthContext へ反映 → `useAuthToken` が token を解決 → 各認証必須機能が動作開始。
6. single-flight (`ensureGuestSession` の inflight lock) で二重発行を防止。

### 7.2 入出力（新仕様）
- `POST /api/auth/guest`
  - req body: `{ fingerprint?: string }`
  - res 200: `{ ticket: string }`
  - res 429: `{ error: 'rate_limited' | 'must_link' }` / res 503: `{ error: 'guest_provision_failed' }`
  - 認証: **不要** (これが session を作る入口)。濫用対策はレート制限 + fingerprint cap。
- `useGuestSession()` — 起動 effect。戻り値 `{ status: 'idle'|'signing-in'|'active'|'error' }` (任意、fatal モーダル制御用)。

### 7.3 データモデル（新仕様）
変更なし。匿名 user は `is_anonymous=true`, `trial_used_count=0` で upsert。

### 7.4 バリデーション・エラー（新仕様）
| ID | 条件 | 対応 |
|---|---|---|
| E-AU-001 | 匿名 session 確立失敗 (endpoint 5xx / ticket sign-in 失敗) | `ensureGuestSession` が retry 1 回 → `AuthInitError` → fatal モーダル |
| E-AU-G10 | `/api/auth/guest` レート超過 | 429、フロントは短時間後に 1 回リトライ |
| E-AU-G11 | fingerprint hard cap 到達 (将来、現状 stub=0) | 429 + mustLink、リンク誘導 |

### 7.5 機能固有 NFR + 既存連携（新仕様）
- **[SEC-001] レート制限**: `/api/auth/guest` に Upstash レート制限を付与 (匿名 user 量産 = Clerk MAU 濫用の防止)。`api/_lib/ratelimit.ts` のパターンを流用 (別 prefix `ratelimit:guest`、IP or fingerprint キー)。
- **[SEC-005] 認可**: 本 endpoint は session を作る入口のため未認証許可。代わりにレート + cap で保護。作成後の Neon upsert は clerk_user_id スコープで実施。
- spam-guard: 既存 `evaluateSpamCheck` / fingerprint cap (stub) と整合。cap の実体化は [論点-006] follow-up のまま (本改修の射程外)。

## 8. タグ別追加項目 (auth-required)
- 匿名 user も「サインイン済み」として全認証必須 API を通過する (JWT subject = Clerk userId)。
- OAuth 後リンク (`linkWithGoogle`) は匿名 user に対し `user.createExternalAccount`/linkIdentity、同 clerk_user_id を維持してデータ継続。

## 9. 未決事項

### [論点-001] concept §4 / 基準 SPEC §1.1 の「Clerk Guest Users β」誤記修正
- **影響範囲**: concept.md §4 (認証行 / アーキ図), `docs/_shared/auth/001_auth_SPEC.md` §1.1 §2.1
- **詰めるべき問い**: 誤前提の文言を本改修の ticket 方式に整合させる範囲
- **推奨**: `/flow:concept` 更新で §4 を「Clerk + バックエンド匿名ユーザー発行 (createUser + signInToken ticket)」に修正。基準 SPEC §1.1 は本 REVISE_SPEC が「変更後」を示すため、tdd 実装後に §1.1 へ追補参照を 1 行追加。
- **判断期限**: 実装 (tdd) 完了時まで
- **担当**: seiji / flow

### [論点-002] Clerk createUser の identifier 要件
- **詰めるべき問い**: Clerk は完全 identifier 無しの user 作成を許すか。許さない場合 `externalId`(生成 UUID) か random `username` のどちらを付与するか
- **推奨**: `externalId` に生成 UUID を付与 (email/username を消費せず後リンクと衝突しない)。実装時に `vercel dev` で実 API 応答を確認して確定 (runtime 検証必須)。

## 10. 更新履歴
| 日付 | 変更概要 | 実行者 |
|---|---|---|
| 2026-05-25 | 初版作成 (Clerk Guest β → backend createUser+ticket) | /flow:revise |

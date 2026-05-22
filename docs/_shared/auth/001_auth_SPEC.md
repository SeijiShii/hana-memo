# _shared/auth 仕様書

> **役割**: 認証・認可基盤 (Clerk Guest Users β + OAuth Linking + SPAM 抑止 + Neon users sync)
> **タグ**: cross-cutting / auth / 基盤
> **最終更新**: 2026-05-22 (BaaS Pivot 反映、D20260522-117)
> **入力アーティファクト**: `../../concept.md` §1.2, §3, §4.1, §6, §7, `../db/001_db_SPEC.md`

---

## 1. 提供インターフェース

### 1.1 フロント (`src/shared/auth/`)

| 関数/コンポーネント | シグネチャ | 説明 |
|---|---|---|
| `<ClerkProvider>` | React Context | Clerk SDK プロバイダ (`@clerk/clerk-react`) を `App.tsx` 最上位に配置 |
| `useUser()` | hook from Clerk | Clerk の現在 user (id, email, primaryEmailAddress, isAnonymous 等) |
| `useGuestSession()` | カスタム hook | 初回起動時に Clerk Guest Users で sign-in 完了を保証 |
| `linkWithGoogle()` | `() => Promise<void>` | `useSignIn` 経由で Google OAuth 起動、success_url=`/auth/callback` で戻る |
| `useSignOut()` | hook from Clerk | session 破棄 |
| `useClerkUserId()` | `() => string` | Clerk user id を同期取得 (Vercel Function 認証で使う JWT のサブジェクト) |

### 1.2 Vercel Function (`api/`)

| エンドポイント | 責務 |
|---|---|
| `/api/clerk-webhook` | Clerk から `user.created` / `user.updated` / `user.deleted` を受信、署名検証後 Neon `users` に upsert / soft delete |
| `/api/auth/spam-check` | Clerk session JWT + fingerprint を受け取り、`trial_used_count` と fingerprint hard cap をチェック、LinkRequired を判定 |

### 1.3 共通ライブラリ (`src/shared/auth/lib/`)

| 関数 | シグネチャ | 説明 |
|---|---|---|
| `verifyClerkSession` (Vercel Function) | `(req: Request) => Promise<{ userId: string; clerkUserId: string }>` | `@clerk/backend` で JWT 検証、Neon users.id を取得 |
| `getFingerprint` (frontend) | `() => Promise<string>` | @fingerprintjs/fingerprintjs (OSS) で hash 計算 |
| `enforceTrialLimit` | `(clerkUserId: string) => Promise<void>` | フロントから `/api/auth/spam-check` 呼出、超過時に LinkRequiredError throw |

## 2. 入出力

### 2.1 外部 API
| サービス | 利用機能 | 認証 |
|---|---|---|
| Clerk | Guest Users β / OAuth (Google) / linkIdentity / Webhook | Publishable + Secret + Webhook Signing Secret |
| Google OAuth | OAuth 2.0 (Clerk 経由) | Clerk 側で完結 |
| FingerprintJS (OSS) | client fingerprint | (なし) |

### 2.2 副作用
- Neon `users` テーブル INSERT/UPDATE/SOFT-DELETE (Clerk Webhook 経由)
- localStorage / cookie: Clerk session token (Clerk SDK 管理)
- 外部 redirect: Google OAuth 認可画面 → `/auth/callback`

## 3. データモデル
新規定義なし。`_shared/db/users` を Clerk と同期。Clerk 側は user store (email + identities + metadata) を管理、Neon 側はアプリ固有 (deleted_at / trial_used_count / ai_credits_remaining 等) を保持。

## 4. バリデーション・エラー

### 4.1 入力チェック
| 関数 | チェック | 失敗時 |
|---|---|---|
| linkWithGoogle | 現在 user が anonymous か | 既に linked なら NoOp |
| enforceTrialLimit | clerkUserId が anonymous か | OAuth user は無制限 |
| verifyClerkSession (Function) | JWT 形式 + 期限 | 401 |
| clerk-webhook | Webhook signature | 401 |

### 4.2 エラーケース
| ID | 条件 | 対応 |
|---|---|---|
| E-AU-001 | Clerk Guest sign-in 失敗 (rate limit / network) | retry 1 回 → 失敗時 fatal モーダル「アプリを起動できません」 |
| E-AU-002 | OAuth redirect state 不一致 | 「認証情報の整合性が取れませんでした」+ 再試行 |
| E-AU-003 | 同 Google アカウントが別 user に link 済 | ガイダンス「このアカウントは別のデバイスで使用済」(merge は提供しない) |
| E-AU-004 | LinkRequiredError (trial 超過) | OAuth 誘導モーダル + 課金 CTA |
| E-AU-005 | fingerprint 計算失敗 | fallback (ua + screen) + console.warn |
| E-AU-006 | Clerk Webhook 重複 (`user.created` 2 回) | べき等性 (clerk_user_id UNIQUE 制約で吸収) |

## 5. NFR + 既存連携

### 5.1 NFR
| 項目 | 目標値 | 根拠 |
|---|---|---|
| Guest sign-in 完了 | < 500ms (既存) / < 2s (新規) | 起動 UX |
| linkWithGoogle redirect 往復 | < 5s (Google 認可画面含む) | OAuth 標準 |
| getFingerprint 計算 | < 300ms | UI ブロック回避 |
| Clerk Webhook → Neon 反映 | < 3s | sync UX |

### 5.2 既存連携
| 連携先 | 種別 | 依存内容 |
|---|---|---|
| `_shared/db` | upsert | Clerk Webhook → users sync |
| `legal` | trigger | 起動直後 Guest sign-in 完了後に consent_logs 確認 |
| `capture` | quota チェック | enforceTrialLimit |
| `billing` | OAuth 必須 | 課金画面遷移時に isLinked() で誘導 |
| `account` | UI 表示 | linkWithGoogle / signOut / identities |

## 6. タグ別追加

### 6.1 認可 (auth)
- Vercel Function 内で `verifyClerkSession(req)` を必ず呼出、ctx.userId を Drizzle クエリの user_id 制約に渡す
- Webhook はサーバー間通信 (Clerk → Vercel) で signing secret 検証必須

### 6.2 基盤
- 他全モジュールが本モジュールに依存
- 例外型 `LinkRequiredError` / `AuthInitError` を export

## 7. スコープ外
- メールマジックリンク → Clerk 標準サポートだが MVP 不採用
- パスキー → Clerk 標準サポート、v2 ([論点-001])
- MFA → v2 (Google OAuth 側で MFA 強制すれば代替可)
- Apple ID / X / GitHub OAuth → 需要次第
- 匿名 user merge 機能
- Edge runtime (Clerk backend SDK は Node runtime 推奨)

## 8. 未決事項
- [論点-006] trial 回数 3 が妥当かは α 後挙動見て調整 (継続)
- [論点-007] 重複アカウント発見時の UX 文言は法務レビュー (継続)

## 9. 更新履歴
| 日付 | 変更概要 | 実行者 |
|---|---|---|
| 2026-05-22 | 初版作成 (Supabase Anonymous Auth 前提) | /flow:feature |
| 2026-05-22 | BaaS Pivot: Clerk Guest Users β + Webhook 連携に書換 (D20260522-117) | /flow:concept (UPDATE) |

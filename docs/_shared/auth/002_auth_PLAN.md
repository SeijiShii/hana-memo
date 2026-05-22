# _shared/auth 実装計画書

> **入力**: `./001_auth_SPEC.md`, `../db/001_db_SPEC.md`
> **最終更新**: 2026-05-22 (BaaS Pivot)

---

## 1. 実装対象ファイル一覧

### 1.1 アプリ層 (`src/shared/auth/`)
| ファイル | 責務 | 依存 | LOC |
|---|---|---|---|
| `provider.tsx` | `<ClerkProvider>` wrapper (publishableKey, appearance, routerProvider) | @clerk/clerk-react | ~40 |
| `guest-session.ts` | useGuestSession (起動時 Guest sign-in 保証) | @clerk/clerk-react | ~60 |
| `link.ts` | linkWithGoogle / isLinked / getIdentities | @clerk/clerk-react | ~80 |
| `spam-guard.ts` | getFingerprint / enforceTrialLimit (fetch /api/auth/spam-check) | @fingerprintjs/fingerprintjs | ~70 |
| `errors.ts` | LinkRequiredError / AuthInitError / OAuthCallbackError | (なし) | ~30 |
| `hooks.ts` | useCurrentUser (Clerk + Neon users 合体) / useClerkUserId | useUser | ~60 |
| `index.ts` | barrel | 全 above | ~10 |

### 1.2 Vercel Function (`api/`)
| ファイル | 責務 | LOC |
|---|---|---|
| `clerk-webhook.ts` | svix で署名検証 + Drizzle で `users` upsert/soft-delete | @clerk/backend, svix, drizzle | ~150 |
| `auth/spam-check.ts` | verifyClerkSession + trial_used_count + fingerprint check | @clerk/backend, drizzle | ~80 |
| `_lib/clerk.ts` | verifyClerkSession ヘルパ (共通) | @clerk/backend | ~50 |

### 1.3 ルーティング
| ルート | コンポーネント | 責務 |
|---|---|---|
| `/auth/callback` | `<OAuthCallback />` (実装は account 機能側) | Clerk redirect 戻り処理 |

### 1.4 Clerk Dashboard 設定
| 項目 | 設定 |
|---|---|
| Authentication Strategies | Guest Users (β) 有効化 + Google OAuth + (将来) Passkey |
| Webhook Endpoint | `https://<deploy-url>/api/clerk-webhook`、events: user.created / user.updated / user.deleted |
| Redirect URLs | `https://<deploy-url>/auth/callback` |
| Restrictions | guest user の MAU 算入率を確認 (β 仕様) |

### 1.5 マイグレーション
- 新規なし (users スキーマは `_shared/db` で定義済)

## 2. 実装 Phase 分割

### Phase 1: ClerkProvider + Guest sign-in (起動時)
- 含む: provider.tsx / guest-session.ts / errors.ts / index.ts
- 検証: 起動時に Clerk anonymous user が作成され、`/api/clerk-webhook` 経由で Neon `users` に row 追加

### Phase 2: Clerk Webhook → Neon sync
- 含む: clerk-webhook.ts (Vercel Function) + svix 検証
- 検証: Clerk Dashboard で user 削除 → Webhook → Neon users.deleted_at set

### Phase 3: OAuth Linking
- 含む: link.ts (linkWithGoogle, isLinked) + /auth/callback (account 機能側)
- 検証: 匿名 user → link → users.linked_at set + linked_at WebHook 反映

### Phase 4: SPAM 抑止
- 含む: spam-guard.ts (fingerprint) + auth/spam-check.ts (Vercel Function)
- 検証: trial_used_count=3 + 4 回目で LinkRequiredError

### Phase 5: hooks 整備
- 含む: hooks.ts (useCurrentUser, useClerkUserId)

## 3. 依存関係順序

```mermaid
graph TD
  Clerk[Clerk SDK] --> P[provider.tsx]
  P --> GS[guest-session.ts]
  Clerk --> L[link.ts]
  FP[@fingerprintjs] --> SG[spam-guard.ts]
  SG --> SC[/api/auth/spam-check]
  Clerk -- Webhook --> WH[/api/clerk-webhook]
  WH --> DB[(Neon users)]
  DB --> H[hooks.ts]
  SC --> DB
```

## 4. 既存ファイル影響
- `src/app/App.tsx` 最上位に `<ClerkProvider>` 配置
- `src/app/router.tsx` に `/auth/callback` ルート (account 側)
- `package.json`: `@clerk/clerk-react`, `@clerk/backend`, `svix`, `@fingerprintjs/fingerprintjs`
- `.env.example`: 上記 §1.1 の Clerk + Webhook keys

## 5. 横断フォルダ追加・変更
| 横断 | 内容 |
|---|---|
| `_shared/db` users schema | (既に Clerk 統合済の前提) |
| `_shared/types/domain.ts` | `Identity`, `TrialQuota`, `LinkRequiredError` 型 |

## 6. リスク・注意点
- **Clerk Guest Users β**: 仕様変更や提供終了リスクあり。retire 時は Lucia 等の自前匿名 sign-in に fallback 検討
- **Webhook 配送保証**: Clerk が retry してくれるが、Neon 側がべき等性確保 (clerk_user_id UNIQUE)
- **Webhook race**: `user.created` と `user.updated` (linked) が前後する可能性 → upsert で両対応
- **localStorage XSS**: Clerk SDK のデフォルト挙動。CSP + XSS 対策徹底
- **service / public key 露出防止**: VITE_ 接頭辞は publishable のみ、secret/webhook は Vercel env で Production/Preview/Development 別管理
- **OAuth callback URL**: dev / preview / prod それぞれを Clerk Dashboard + Google Console に登録 (`${window.location.origin}/auth/callback`)
- **Edge runtime**: Clerk backend SDK は Node runtime 推奨 → Vercel Function を `export const runtime = 'nodejs'` で明示

## 7. DoD
- [ ] アプリ起動で必ず Clerk Guest user が生成され、Neon users に同期される
- [ ] OAuth Linking で linked_at が set される
- [ ] 匿名で 3 回 AI 呼出 → 4 回目 LinkRequiredError
- [ ] OAuth user は trial 制限なし
- [ ] signOut で session が完全に消える
- [ ] PWA standalone モードで OAuth redirect が動く
- [ ] Webhook 重複でも DB が重複しない
- [ ] vitest (frontend) + Vitest/Node (Vercel Function) pass

## 8. 更新履歴
| 日付 | 変更概要 | 実行者 |
|---|---|---|
| 2026-05-22 | 初版作成 (Supabase Auth 前提) | /flow:feature |
| 2026-05-22 | BaaS Pivot: Clerk + Webhook 連携に書換 (D20260522-117) | /flow:concept (UPDATE) |

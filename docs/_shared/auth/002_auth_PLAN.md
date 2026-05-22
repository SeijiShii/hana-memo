# _shared/auth 実装計画書

> **入力**: `./001_auth_SPEC.md`, `../db/001_db_SPEC.md`
> **最終更新**: 2026-05-22

---

## 1. 実装対象ファイル一覧

### 1.1 アプリ層 (`src/shared/auth/`)
| ファイル | 責務 | 依存 | LOC |
|---|---|---|---|
| `client.ts` | Supabase クライアント (公開 anon key) 生成 + シングルトン | @supabase/supabase-js | ~30 |
| `session.ts` | initSession / getCurrentUser / useCurrentUser / signOut | client, _shared/db (users 更新) | ~120 |
| `link.ts` | linkGoogleIdentity / handleOAuthCallback / getIdentities / isLinked | client | ~100 |
| `spam-guard.ts` | getFingerprint / checkTrialQuota / enforceTrialLimit | @fingerprintjs/fingerprintjs, client | ~80 |
| `rls.ts` | assertOwnUser, LinkRequiredError, AuthInitError | (なし) | ~40 |
| `store.ts` | Zustand or React Context での session state | zustand | ~50 |
| `hooks/useAuth.ts` | useCurrentUser / useIdentities 等の hook 集 | store | ~60 |
| `index.ts` | barrel | 全 above | ~10 |

### 1.2 ルーティング (`src/app/router.tsx`)
| ルート | コンポーネント | 責務 |
|---|---|---|
| `/auth/callback` | `<OAuthCallback />` | OAuth redirect 戻り処理 (handleOAuthCallback 呼出 → メインへ) |

### 1.3 Supabase 設定
| 項目 | 設定 |
|---|---|
| Auth Providers | Anonymous (enable), Google (enable + client_id/secret) |
| Site URL | `https://hana-memo.vercel.app` (prod) / `http://localhost:5173` (dev) |
| Redirect URLs | `${SITE_URL}/auth/callback` |
| Anonymous user 設定 | Enable, default disable 不可設定確認 |

### 1.4 マイグレーション (`supabase/migrations/`)
| ファイル | 責務 | LOC |
|---|---|---|
| `20260522_018_users_fingerprint.sql` | `users` テーブルに `fingerprint_hash text`, `trial_used_count int default 0` 追加 | ~10 |
| `20260522_019_users_linked_at_trigger.sql` | identity_link 発生時に `users.linked_at = now()` を set する trigger | ~20 |

## 2. 実装 Phase 分割

### Phase 1: client + session (匿名スタート)
- ゴール: アプリ起動で必ず anonymous user が作成される
- 含む: client.ts / session.ts / rls.ts (例外型のみ) / store.ts / index.ts
- 検証: ローカルで起動 → DB の users テーブルに 1 行追加されることを確認

### Phase 2: OAuth Linking
- ゴール: 設定画面の「Google で連携」ボタン → redirect → 戻り → linked_at 更新
- 含む: link.ts / OAuthCallback ルート
- 検証: 匿名 user → link → users.linked_at が set される

### Phase 3: SPAM 抑止
- ゴール: 匿名 user が 3 回 AI 呼出 → 4 回目で LinkRequiredError
- 含む: spam-guard.ts / fingerprint 計算
- 検証: trial_used_count が増加し、超過時に正しく throw

### Phase 4: hooks 整備
- ゴール: フロント UI から useAuth() 1 つで current user / linked / trial 状態を取得
- 含む: hooks/useAuth.ts

## 3. 依存関係順序

```mermaid
graph TD
  C[client.ts] --> S[session.ts]
  C --> L[link.ts]
  C --> SG[spam-guard.ts]
  S --> ST[store.ts]
  L --> ST
  ST --> H[useAuth hook]
  SG --> FP[@fingerprintjs]
  DB[(public.users)] --> S
  DB --> SG
```

## 4. 既存ファイル影響
- `src/app/App.tsx` の最上位で `await initSession()` を実行 (Suspense or top-level await)
- `src/app/router.tsx` に `/auth/callback` ルート追加
- `.env.example` に `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_GOOGLE_OAUTH_CLIENT_ID` (Supabase 側設定だが文書化目的)
- `package.json`: `@supabase/supabase-js`, `@fingerprintjs/fingerprintjs`, `zustand`

## 5. 横断フォルダ追加・変更
| 横断フォルダ | 追加・変更内容 |
|---|---|
| `_shared/db/migrations/` | 018, 019 を追加 |
| `_shared/db/001_db_SPEC.md` の users テーブル | fingerprint_hash, trial_used_count カラム追加を反映 (要更新) |
| `_shared/types/domain.ts` | `Identity`, `TrialQuota`, `LinkRequiredError` 型 |

## 6. リスク・注意点
- **Supabase Anonymous Auth は abuse 対象**: 起動ごとに無制限 user 生成可能 → SPAM 抑止 (Phase 3) と Supabase の rate limit でカバー
- **匿名 user の DB 残骸**: 起動だけして使わない user が累積する → 30 日後に未利用 user (no discoveries, no consent_logs after consent) を cron で削除する Edge Function を別途 (本 SPEC 外、運用 task)
- **OAuth redirect URL の hard-code リスク**: prod / dev / preview で動的に決定する必要 → `${window.location.origin}/auth/callback`
- **fingerprint 精度**: open-source 版は限定的、本気で abuse 対策するなら Pro 版 (有料) 検討、ただし MVP では Free で十分
- **identity linking conflict**: 別 device で同じ Google アカウントが既に link 済の場合は Supabase 側でエラー → E-AU-003 で guidance、UX 文言が法的に問題ないかレビュー要
- **session の localStorage XSS**: Supabase SDK のデフォルト挙動 (localStorage 保存) は XSS で漏洩リスクあり → CSP + XSS 対策の徹底で防御
- **service_role key の漏洩防止**: Vercel env で edge function 専用に設定、frontend には絶対に渡さない (build 時の env separation を徹底)

## 7. DoD
- [ ] アプリ起動で必ず anonymous user が生成される
- [ ] OAuth Linking で linked_at が set される
- [ ] 匿名で 3 回 AI 呼出 → 4 回目 LinkRequiredError
- [ ] OAuth user は trial 制限なし
- [ ] signOut で session が完全に消える
- [ ] PWA standalone モードで OAuth redirect が動く
- [ ] vitest で全関数 pass

## 8. 更新履歴
| 日付 | 変更概要 | 実行者 |
|---|---|---|
| 2026-05-22 | 初版作成 | /flow:feature |

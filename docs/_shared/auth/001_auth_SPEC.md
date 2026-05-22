# _shared/auth 仕様書

> **役割**: 認証・認可基盤 (Supabase Auth ラッパ + 匿名スタート + OAuth Linking + SPAM 抑止)
> **タグ**: cross-cutting / auth / 基盤
> **最終更新**: 2026-05-22
> **入力アーティファクト**: `../../concept.md` §1.2, §3, §4.1, §6, §7, `../db/001_db_SPEC.md`

---

## 1. 提供インターフェース

### 1.1 セッション初期化 (`src/shared/auth/session.ts`)
| 関数 | シグネチャ | 説明 |
|---|---|---|
| `initSession` | `() => Promise<User>` | 起動直後に必ず実行。既存 session があれば返却、無ければ `supabase.auth.signInAnonymously()` を呼ぶ |
| `getCurrentUser` | `() => User \| null` | 同期取得 (sessionStore 経由) |
| `useCurrentUser` | `() => User \| null` | React hook、session 変化に追従 |
| `signOut` | `() => Promise<void>` | session 破棄 (匿名 user は孤児化、データはアプリ上で見えなくなる) |

### 1.2 OAuth Linking (`src/shared/auth/link.ts`)
| 関数 | シグネチャ | 説明 |
|---|---|---|
| `linkGoogleIdentity` | `() => Promise<void>` | `supabase.auth.linkIdentity({provider:'google'})` を same-tab redirect で呼ぶ |
| `getIdentities` | `() => Promise<Identity[]>` | 自分の linked identity 一覧 (現在は anonymous + google の 2 種のみ) |
| `isLinked` | `() => boolean` | google identity が存在するか同期判定 |
| `handleOAuthCallback` | `(url: string) => Promise<void>` | redirect 戻り処理、users.linked_at に timestamp 保存 |

### 1.3 SPAM 抑止 (`src/shared/auth/spam-guard.ts`)
| 関数 | シグネチャ | 説明 |
|---|---|---|
| `getFingerprint` | `() => Promise<string>` | fingerprintjs で device fingerprint 計算 (SHA-256 hash 化して保存) |
| `checkTrialQuota` | `(userId: string) => Promise<TrialQuota>` | 匿名 user の AI 呼び出し回数を確認 (max 3 trial) |
| `enforceTrialLimit` | `(userId: string) => Promise<void>` | 超過時に LinkRequiredError をスロー (UI 側で OAuth 誘導 modal を表示) |

### 1.4 RLS 連携ヘルパ (`src/shared/auth/rls.ts`)
| 関数 | シグネチャ | 説明 |
|---|---|---|
| `assertOwnUser` | `(userId: string) => void` | 操作対象 userId と current user が一致しない場合スロー (フロント側の防御線) |

## 2. 入出力

### 2.1 外部 API
| サービス | 利用機能 | 認証 |
|---|---|---|
| Supabase Auth | signInAnonymously / linkIdentity / signOut / getSession | publishable anon key |
| Google OAuth (via Supabase) | OAuth 2.0 redirect | Supabase project の Google provider 設定 |
| FingerprintJS (open-source) | クライアント fingerprint | (なし、ブラウザ内処理) |

### 2.2 副作用
- DB 書込: `users` (auth.users 経由で自動 INSERT、`linked_at` 更新は trigger or app-level)
- localStorage / cookie: Supabase Auth セッショントークン (Supabase SDK 管理)
- 外部 redirect: Google OAuth 認可画面 → アプリ callback URL

## 3. データモデル
新規定義なし。`auth.users` (Supabase 管理) + `public.users` (app 拡張: is_anonymous, linked_at, fingerprint_hash) に依存。

## 4. バリデーション・エラー

### 4.1 入力チェック
| 関数 | チェック | 失敗時 |
|---|---|---|
| linkGoogleIdentity | 現在 user が匿名であるか | 既に link 済なら NoOp + console.info |
| enforceTrialLimit | userId が anonymous か | OAuth user は無制限 |

### 4.2 エラーケース
| ID | 条件 | 対応 |
|---|---|---|
| E-AU-001 | signInAnonymously 失敗 (Supabase Free 枠 / network) | retry 1 回、失敗時 fatal モーダル「アプリを起動できません」 |
| E-AU-002 | OAuth redirect 戻り state 不一致 | エラーモーダル「認証情報の整合性が取れませんでした」+ 再試行リンク |
| E-AU-003 | 既に同 Google アカウントが別 user に link 済 | guidance モーダル「このアカウントは既に別のデバイスで使われています。そちらでログインしてください」 (本デバイスデータは破棄せず保持、merge は提供しない) |
| E-AU-004 | LinkRequiredError (trial 超過) | UI 側で OAuth 誘導モーダル、課金 CTA も同画面に配置 |
| E-AU-005 | fingerprint 計算失敗 | fallback として user-agent + screen size の弱 fingerprint を使用 (精度低下警告 log) |
| E-AU-006 | session refresh 失敗 (token 期限切れ + ネットワークなし) | 一時的にローカルキャッシュで継続、復帰時に refresh |

## 5. NFR + 既存連携

### 5.1 NFR
| 項目 | 目標値 | 根拠 |
|---|---|---|
| initSession 完了時間 | < 500ms (既存 session)、< 2s (新規 signInAnonymously) | 起動 UX |
| linkIdentity redirect 往復 | < 5s (Google 認可画面含む) | OAuth 標準 |
| getFingerprint 計算 | < 300ms | UI ブロック回避 |
| session 存続期間 | デフォルト 1 週間、auto-refresh | 利便性 + 安全性のバランス |

### 5.2 既存連携
| 連携先 | 種別 | 依存内容 |
|---|---|---|
| `_shared/db` | RLS | auth.uid() が全テーブルの RLS に効くこと |
| `legal` | trigger | 起動直後 signInAnonymously 完了後に consent_logs 確認 |
| `capture` | quota チェック | AI 呼び出し前に enforceTrialLimit |
| `billing` | OAuth 必須 | 課金画面遷移時に isLinked() で OAuth ない場合は誘導 |
| `account` | UI 表示 | linkGoogleIdentity / signOut / getIdentities を呼ぶ |

## 6. タグ別追加

### 6.1 認可 (auth)
- 全テーブル RLS は `auth.uid() = user_id` で統一 (`_shared/db` 整合)
- service_role key は Edge Function 内のみ使用、フロントには絶対露出しない
- 匿名 user の uid もきちんと auth.uid() で取れることを確認 (Supabase 仕様)

### 6.2 基盤 (基盤)
- 他全モジュールが本モジュールに依存。本モジュールは barrel export を最小に保つ
- 例外型 `LinkRequiredError`, `AuthInitError` を export

## 7. スコープ外
- メールマジックリンク → v2 ([論点-001])
- パスキー → v2
- 多要素認証 (MFA) → v2 (Google OAuth 側で MFA 強制すれば代替可)
- Apple ID / Twitter OAuth → 需要次第
- 匿名 user の merge 機能 (D20260522-058 で対象外)
- session shared between devices without OAuth → 実装上不可能 (匿名 user は device 固有)

## 8. 未決事項
- [論点-006] SPAM 抑止: trial 回数 3 が妥当かは α 後の挙動見て調整
- [論点-007] 重複アカウント発見時の UX 文言: legal 表現として要レビュー

## 9. 更新履歴
| 日付 | 変更概要 | 実行者 |
|---|---|---|
| 2026-05-22 | 初版作成 | /flow:feature |

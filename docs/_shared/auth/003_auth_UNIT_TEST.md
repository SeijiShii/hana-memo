# _shared/auth 単体テスト計画

> **入力**: `./001_auth_SPEC.md`, `./002_auth_PLAN.md`
> **最終更新**: 2026-05-22

---

## 1. テストケース

### 1.1 session.ts
| ID | 関数 | 入力 | 期待出力 |
|---|---|---|---|
| UT-AU-S01 | initSession 既存 session なし | mock getSession=null | signInAnonymously 1 回呼出、User 返却 |
| UT-AU-S02 | initSession 既存 session あり | mock getSession=valid | signInAnonymously 呼出なし、User 返却 |
| UT-AU-S03 | initSession signInAnonymously 失敗 | mock error | retry 1 回 → 最終 throw AuthInitError |
| UT-AU-S04 | getCurrentUser 同期 | store に user あり | User 返却 |
| UT-AU-S05 | useCurrentUser hook | store 更新 | re-render |
| UT-AU-S06 | signOut | (mock supabase) | session 削除、store クリア |

### 1.2 link.ts
| ID | 関数 | 入力 | 期待出力 |
|---|---|---|---|
| UT-AU-L01 | linkGoogleIdentity 匿名 user | (mock) | linkIdentity({provider:'google', options:{redirectTo:...}}) 1 回 |
| UT-AU-L02 | linkGoogleIdentity 既 link 済 | identities=['google'] | NoOp + console.info |
| UT-AU-L03 | handleOAuthCallback 正常 | URL with code | session 更新 + linked_at update 1 回 |
| UT-AU-L04 | handleOAuthCallback state 不一致 | invalid state | throw OAuthCallbackError |
| UT-AU-L05 | handleOAuthCallback 重複 link | mock error code=identity_already_exists | E-AU-003 ガイダンスエラー throw |
| UT-AU-L06 | getIdentities | (mock) | Identity[] 配列 |
| UT-AU-L07 | isLinked anonymous-only | identities=['anonymous'] | false |
| UT-AU-L08 | isLinked google linked | identities=['anonymous','google'] | true |

### 1.3 spam-guard.ts
| ID | 関数 | 入力 | 期待出力 |
|---|---|---|---|
| UT-AU-G01 | getFingerprint | (mock fingerprintjs) | 64 char hex 文字列 (SHA-256) |
| UT-AU-G02 | getFingerprint 失敗 | mock fingerprintjs throw | fallback: ua+screen の弱 fingerprint + console.warn |
| UT-AU-G03 | checkTrialQuota anonymous 0 回 | trial_used_count=0 | {used:0, max:3, remaining:3, mustLink:false} |
| UT-AU-G04 | checkTrialQuota anonymous 3 回 | trial_used_count=3 | {used:3, max:3, remaining:0, mustLink:true} |
| UT-AU-G05 | checkTrialQuota OAuth user | is_anonymous=false | {used:N, max:Infinity, remaining:Infinity, mustLink:false} |
| UT-AU-G06 | enforceTrialLimit 超過 | mustLink=true | throw LinkRequiredError |
| UT-AU-G07 | enforceTrialLimit 範囲内 | mustLink=false | resolve |
| UT-AU-G08 | fingerprint hard cap | 同 fingerprint で 100 user 試行 | 100 件目で reject |

### 1.4 rls.ts
| ID | 関数 | 入力 | 期待出力 |
|---|---|---|---|
| UT-AU-R01 | assertOwnUser 自分 | current=A, target=A | resolve |
| UT-AU-R02 | assertOwnUser 他人 | current=A, target=B | throw Error('RLS violation') |
| UT-AU-R03 | LinkRequiredError | instanceof | Error 継承確認 |

### 1.5 異常系・境界
| ID | 対象 | 条件 | 期待 |
|---|---|---|---|
| UT-AU-E01 | session 同時初期化 | initSession を 10 並列で呼ぶ | signInAnonymously は 1 回のみ (lock) |
| UT-AU-E02 | OAuth callback url 不正形式 | "ftp://example" | throw |
| UT-AU-E03 | fingerprint 全 ASCII | 通常入力 | hex 出力 |
| UT-AU-B01 | trial_used_count race | 並列 INSERT 4 件 (匿名 user) | 4 件目以降が enforceTrialLimit で reject |

## 2. Mock 方針

| 対象 | 方針 | 理由 |
|---|---|---|
| @supabase/supabase-js | vitest mock (auth, from) | 外部呼出回避 |
| @fingerprintjs/fingerprintjs | mock | テスト deterministic |
| window.location | jsdom 標準 + 一部 stub | redirect URL 検証 |
| Date.now | vi.useFakeTimers | session 期限テスト |

## 3. カバレッジ目標
| 種別 | 目標 | 根拠 |
|---|---|---|
| 行カバレッジ | 90% | 認証は重要、厚く |
| 分岐カバレッジ | 85% | 全エラーケース通す |

## 4. テスト実行環境
- vitest + jsdom + @testing-library/react
- CI 並列実行可

## 5. 更新履歴
| 日付 | 変更概要 | 実行者 |
|---|---|---|
| 2026-05-22 | 初版作成 | /flow:feature |

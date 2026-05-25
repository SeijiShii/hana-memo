# リグレッションテスト計画: guest-trial-quota

> **入力**: ./001_ROOT_CAUSE.md, ./002_FIX_PLAN.md
> **最終更新**: 2026-05-25

## 1. 再発防止テストケース

### 1.1 直接原因を捉えるテスト (このバグが再発したら確実に検知)
| ID | 対象 | 入力 | 期待 (修正前=失敗 / 後=成功) |
|---|---|---|---|
| effectiveQuota 匿名新規 | `quota.ts` | isAnonymous=true, trial_used=0 | remaining=ANON_TRIAL_MAX, consume='trial', mustLink=false (修正前は trial を見ないため概念自体が無かった) |
| identify 匿名残あり | `identify-plant` | getQuota={remaining:3, consume:'trial'} | persist が consume='trial'、OpenAI 実行 |

### 1.2 修正後に必ず通るテスト
| ID | 期待 |
|---|---|
| 匿名 trial 使い切り | mustLink=true → runIdentify が LinkRequiredError (401) |
| 登録 月次使い切り+credits 0 | QuotaExceededError (402) |
| 登録 月次内 | consume='monthly' (api_usage 行のみ) |
| 登録 月次切れ+credits>0 | consume='credits' (ai_credits--) |
| useIdentifyQuota | status.quotaRemaining/mustLink を返す、欠落時 null |

## 2. 類似境界条件テスト
| ID | 境界 | 期待 |
|---|---|---|
| fingerprint 無し | — | (guest 発行側、別 fix) |
| quota 欠落レスポンス (旧 server) | useIdentifyQuota | remaining=null → checkQuota は通す近似 (server enforce) |
| anonMax opts 上書き | effectiveQuota | 反映 |

## 3. 既存テスト維持確認
| 既存 | 維持理由 |
|---|---|
| identify rate-limit/ownership/retry/parse | quota 以外の経路不変 |
| billing useAiCredits/usePdfUnlocked | 表示用に温存 (semantics 不変) |
| PreviewContainer 遷移 | gate ソースのみ差替 |

## 4. E2E シナリオ追加 (実機/`/flow:e2e`)
| シナリオ | 内容 |
|---|---|
| E2E-AI-Q01 | 新規ゲスト → 撮影→識別 が 3 回成功 |
| E2E-AI-Q02 | 4 回目 → link_required (Google 連携誘導) |

## 5. Mock 方針
DB/Clerk は注入 (effectiveQuota は純関数で固定値、identify deps は getQuota/persist mock)。fetchEffectiveQuota の DB 読みは runtime/E2E で検証。

## 6. カバレッジ目標
effectiveQuota 分岐 100% (匿名残/匿名切れ/登録月次/登録credits/登録切れ)。identify の trial/link/quota 分岐 100%。

## 7. 実績
新規 13 テスト (effectiveQuota 9 + identify trial/link/quota 3 + useIdentifyQuota 2)。全体 919→932 green、typecheck 0、eslint 0。

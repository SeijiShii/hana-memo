# クレーム判定レポート

**claim id**: 001
**判定日**: 2026-05-25
**判定者**: Claude (Opus 4.7) + seiji
**判定**: **バグ (fix)**

## 1. 三項照合

### 1.1 期待 (Expected)
新規匿名ユーザーが無料枠/お試しで AI 同定を実行できる (画像選択 → 植物名が返る)。

### 1.2 既存仕様 (Spec)
- **concept.md §4**: 「撮影・保存・**無料枠**まで匿名で完結」(line 34) / 「ユーザー月 **10 回無料** + 超過は課金で回収」(line 151)
- **`_shared/ai/001_ai_SPEC.md` §4 (line 100)**: 「identify-plant (Function) | quota 残あり (**users.ai_credits_remaining or trial**) | 402 Quota Exceeded」 ← **quota は ai_credits_remaining「または trial」で判定すると明記**
- 同 §4 (line 101): 「OAuth 必須 (**匿名 trial 超過**)」 ← 匿名は trial を使い切って初めて link 要求
- **`src/shared/auth/trial.ts`**: `ANON_TRIAL_MAX = 3`、`checkTrialQuota({isAnonymous, trialUsedCount})` で無料枠を算出 (= trial 機構は実装済)

### 1.3 現実 (Actual)
- サーバ source of truth `api/identify-plant.ts` の `fetchQuotaRemaining` (≈L154): `select({ remaining: users.aiCreditsRemaining })` のみ。**trial を参照しない**
- 同 `persistIdentify` (≈L185): `users.aiCreditsRemaining` を減算するのみ。**trial_used_count を増やさない**
- `src/shared/ai/quota.ts` `consumeQuota(remaining)`: 単純に `remaining - 1` (trial 概念なし)
- フロント `src/features/billing/hooks.ts` `useAiCredits` (L55): `status.aiCreditsRemaining ?? null` のみ。`api/billing/status.ts` も `aiCreditsRemaining` のみ返す
- フロント gate `PreviewContainer` `checkQuota: () => credits === null || credits > 0` → 新規 user は `ai_credits_remaining=0` (schema default) → `0 > 0=false` → QuotaModal「使い切りました」
- **結論**: `trial`/`ANON_TRIAL_MAX`/`trial_used_count` は `trial.ts` + `spam-check` にあるが、**identify quota パス (server fetchQuotaRemaining/persist + frontend useAiCredits/checkQuota) に一度も接続されていない**

### 1.4 照合結果
期待 = SPEC §4 line 100 (「ai_credits_remaining **or trial**」) と一致。現実は trial を無視し ai_credits_remaining(=0) のみ参照 → **Actual ≠ Spec**。trial 機構は設計・実装済だが identify 経路に配線漏れ。

## 2. 判定根拠

1. SPEC が quota = 「ai_credits_remaining **or trial**」と**明示**しており (ai SPEC §4 L100)、期待はこの SPEC と一致する。
2. 実装は trial 分岐を**完全に欠落**させ ai_credits_remaining のみで判定 → SPEC 記載通りに動いていない = 仕様検討漏れ(revise)ではなく**実装バグ(fix)**。
3. trial の構成要素 (ANON_TRIAL_MAX / checkTrialQuota / trial_used_count カラム) は既に存在し、identify 経路へ繋ぐだけ = 局所的な配線バグ。
4. 影響は全新規ユーザー (無料枠 0 回成立) でコア価値が届かず、severity = high。

## 3. 推奨分岐先

- **コマンド**: `/flow:fix`
- **引数**: `_shared/ai 001 --severity=high --from-claim=001`
- **修正範囲 (fix で詰める)**:
  - server `fetchQuotaRemaining`: 実効 quota = `(isAnonymous ? max(0, ANON_TRIAL_MAX - trial_used_count) : 0) + ai_credits_remaining`
  - server `persistIdentify`: 匿名は trial_used_count++ (trial 枠消費)、購入 credits があればそちら優先 or 後 — 消費順序を SPEC 化
  - frontend quota 表示 (`api/billing/status` or 専用 quota endpoint): 実効残数を返し `useAiCredits`/`checkQuota` が trial を含む値で判定
  - 匿名 trial 超過時は 401 link_required (ai SPEC L101) へ繋ぐ (QuotaModal の「お試し回数を使い切りました…Google 連携」分岐 = QuotaModal.tsx に既存)
- **優先度**: high (コア体験ブロッカー)

## 4. 関連
- クレーム原文: `./000_CLAIM_REPORT.md`
- 起点: auth revise_001 (匿名サインイン) で session 成立 → 本 quota 配線漏れが露見
- SPEC: `../001_ai_SPEC.md` §4 / `../../concept.md` §4
- trial 機構: `../../_shared/auth/trial.ts` (ANON_TRIAL_MAX)
- 分岐先 (Step 6 後追記): `../fix_001_20260525_*/`

# 根本原因分析: 新規ゲストが初回識別で「使い切りました」

> **入力**: ./000_調査レポート.md, identify-plant.ts / quota.ts / billing/{status,hooks}.ts / capture/PreviewContainer.tsx
> **最終更新**: 2026-05-25

## 1. 5 Whys

| # | 問い | 答え |
|---|---|---|
| Why1 | なぜ新規ゲストが「使い切り」になるか | 撮影前 quota ゲート `checkQuota: credits>0` が false。credits = ai_credits_remaining = 0 (新規 default) |
| Why2 | なぜ credits=0 で判定するか | `useAiCredits` が `billing/status.aiCreditsRemaining` のみ返し、frontend gate がそれを使う |
| Why3 | なぜ trial を見ないか | server も `fetchQuotaRemaining` が `users.aiCreditsRemaining` のみ select、`consumeQuota` も単純減算で trial 概念なし |
| Why4 | なぜ trial が identify 経路に無いか | trial 機構 (ANON_TRIAL_MAX/checkTrialQuota/trial_used_count) は `auth/trial.ts` + `spam-check` に実装されたが、identify quota パス (server fetch/persist + frontend gate) に**接続されなかった** |
| Why5 (根本) | なぜ接続漏れたか | SPEC §4 L100 は「quota = ai_credits_remaining **or trial**」と明記していたが、実装時に trial 半分 (spam-check 側) と identify quota 半分 (ai_credits 側) が**別々に実装され、両者を繋ぐ実効 quota 層が無かった** (2 つの無料枠概念の統合定義が未配線) |

## 2. 直接原因
| ファイル | 箇所 | 問題 |
|---|---|---|
| `api/identify-plant.ts` | `fetchQuotaRemaining` (旧) | `select({remaining: users.aiCreditsRemaining})` のみ、trial 不参照 |
| `src/shared/ai/quota.ts` | `consumeQuota` | 単純 `remaining-1`、trial/monthly 概念なし |
| `api/billing/status.ts` | `fetchStatus` (旧) | `aiCreditsRemaining` のみ返す |
| `src/features/billing/hooks.ts` | `useAiCredits` | `aiCreditsRemaining` を quota 代用 |
| `src/features/capture/PreviewContainer.tsx` | `checkQuota` | `credits>0` (=ai_credits) で判定 |

## 3. 根本原因
「匿名 trial (生涯3回)」と「購入クレジット」「(将来)登録月次無料」という複数の無料枠概念が個別実装され、**identify 経路で参照すべき "実効 quota" を算出する単一の層が存在しなかった**。SPEC は or trial を要求していたが、実装が分断されていた。

## 4. 寄与要因
| 種別 | 内容 |
|---|---|
| テスト不足 | 「新規匿名が identify できる」結合観点のテストが無かった (各半分は unit 済だが繋ぎが未検証) |
| ドキュメント | SPEC §4 の「or trial」が 1 行で、実装の分担境界が曖昧 |
| 配線漏れ | revise/feature 間で trial→identify の橋渡しが defer されたまま実装フェーズで顕在化せず (mock unit が通っていた) |

## 5. 仮説と検証
| 仮説 | 検証 | 結果 |
|---|---|---|
| identify quota が trial 不参照 | コード Read (fetchQuotaRemaining / useAiCredits) | ✅ 確認 |
| trial 機構自体は存在 | trial.ts ANON_TRIAL_MAX / checkTrialQuota | ✅ 存在 (未配線) |
| 新規 user は ai_credits=0 | schema default | ✅ default 0 |

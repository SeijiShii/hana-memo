# 修正計画: 新規ゲストが初回識別で「使い切りました」

> **入力**: ./001_ROOT_CAUSE.md, claim TRIAGE, ユーザー決定 (匿名3回生涯 + リンク後月10回)
> **最終更新**: 2026-05-25

## 0. 確定した quota モデル (ユーザー決定)
- 匿名: `ANON_TRIAL_MAX`(3) 回 生涯無料 (`trial_used_count`)。使い切り → Google リンク要求 (401 link_required)。
- 登録(リンク済): 月 `MONTHLY_FREE_LIMIT`(10) 回無料 (当月 identify 件数 = api_usage) + 購入 `ai_credits_remaining`。

## 1. 修正対象ファイル

| ファイル | 修正内容 |
|---|---|
| `src/shared/ai/quota.ts` | `effectiveQuota()` 純関数 + `MONTHLY_FREE_LIMIT` 追加。匿名=trial / 登録=月次+credits、`{remaining, mustLink, consume}` を返す。`ANON_TRIAL_MAX` は auth/trial を再利用 (drift 回避) |
| `src/shared/ai/errors.ts` | `LinkRequiredError` (401) 追加 |
| `api/_lib/quota.ts` (新規) | `fetchEffectiveQuota(userId)` — users 行 + 登録の当月 api_usage 件数を読み effectiveQuota。identify と billing/status が共用 (単一化) |
| `api/identify-plant.ts` | deps `getQuotaRemaining→getQuota(): EffectiveQuota` / `persist` が `consume` を受け trial++ or credits-- / 残0で mustLink?LinkRequiredError:QuotaExceededError / mapError link_required→401 |
| `api/billing/status.ts` | `quotaRemaining`+`mustLink` を fetchEffectiveQuota で返す |
| `src/features/billing/{api,hooks,index}.ts` | BillingStatus に quotaRemaining/mustLink (optional) + `useIdentifyQuota` hook |
| `src/features/capture/PreviewContainer.tsx` | checkQuota を `useIdentifyQuota().remaining>0` に (ai_credits 単独でなく) |

## 2. 修正範囲の限定方針
根本原因 (実効 quota 層の欠落) を埋める最小構成。consumeQuota 既存関数は他参照のため温存。frontend は gate のみ useIdentifyQuota に切替 (useAiCredits は billing 表示用に残す)。

## 3. 副作用なき確認方法
- 既存テスト維持: identify-plant の rate-limit/ownership/retry/parse、billing useAiCredits/usePdfUnlocked、PreviewContainer 遷移。
- 追加テスト: 003 参照 (effectiveQuota 9 / identify trial・link・quota / useIdentifyQuota)。
- 手動: vercel dev で新規ゲスト→撮影→識別成功 (trial)、billing/status が quotaRemaining=3。

## 4. リリース戦略
即時 (high、コア導線ブロック)。α 未公開で段階展開不要。

## 5. ロールバック方針
コード revert で戻せる (DB スキーマ変更なし。trial_used_count/ai_credits は既存カラム)。

## 6. DoD
- [x] effectiveQuota + identify + billing/status + frontend gate 実装
- [x] `npm test` 全 green (919→932)、typecheck 0、eslint 0
- [ ] vercel dev で新規ゲストが 3 回識別でき 4 回目で link 要求 (実機/E2E)
- [ ] /dev-review (任意)
- [ ] SPEC §4 整合追記 (follow-up)

## 7. 更新履歴
| 2026-05-25 | 初版 + 実装完遂 | /flow:fix |

# バグ修正: 新規ゲストが無料枠を 1 度も使えない (trial 未配線)

- **issue / slug**: 001 / guest-trial-quota
- **重大度**: high
- **実施日**: 2026-05-25
- **対象**: ../README.md (_shared/ai)
- **基準 SPEC**: ../001_ai_SPEC.md §4
- **起点 claim**: ../claim_001_20260525_guest-trial-quota/001_TRIAGE.md
- **バグ**: identify quota が `ai_credits_remaining` 単独 (trial 不参照) → 新規匿名 (ai_credits=0) が初回で「使い切り」
- **状態**: 実装完了 (unit 932 green) — 実機/E2E 検証待ち

## ドキュメント
- `000_調査レポート.md` / `001_ROOT_CAUSE.md` (5 Whys) / `002_FIX_PLAN.md` / `003_REGRESSION_TEST.md` / `004_POSTMORTEM.md`

## 実装
- `src/shared/ai/quota.ts` (effectiveQuota + MONTHLY_FREE_LIMIT) / `api/_lib/quota.ts` (fetchEffectiveQuota 共用) / `api/identify-plant.ts` (getQuota + link_required) / `api/billing/status.ts` (quotaRemaining+mustLink) / `src/features/billing/{api,hooks,index}.ts` (useIdentifyQuota) / `src/features/capture/PreviewContainer.tsx` (gate)
- AI_LOG: ../../AI_LOG/D20260525_063_fix__shared_ai_001.md

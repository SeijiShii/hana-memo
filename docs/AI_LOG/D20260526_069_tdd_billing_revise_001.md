# AI_LOG — /flow:tdd billing revise_001 #069

- **実行日時**: 2026-05-26 (+09:00)
- **コマンド**: /flow:tdd (revise モード、/flow:auto 反復1 から dispatch)
- **対象**: billing revise_001 (guest-billing)
- **実行者**: seiji + Claude
- **状態**: 進行中 (Phase 1 完了、Phase 2-6 残)
- **含まれる decision 範囲**: R3 解決 / Phase 1 (quota core + identify) TDD

## 主要決定サマリ

| id | フェーズ | 決定 |
|---|---|---|
| D20260526-021 | Phase 1 前 R3 解決 | trial.ts `checkTrialQuota` の唯一の caller は spam-check.ts (fingerprint spam-guard) のみ。identify は effectiveQuota 経由で trial.ts 非経路。→ TrialQuota.mustLink は濫用制御専用 (R2/Phase5)、Phase1 は EffectiveQuota のみで安全 |
| D20260526-022 | Phase 1 TDD | quota.ts 匿名分岐を trial+credits 化・mustLink 恒久 false (可逆性優先: フィールドは残し後続 Phase で除去)。identify 常に 402。RED→GREEN green |

## Phase 進捗

- ✅ **Phase 1 (quota core + identify)**: 完了・commit `332e370`。quota 11 + identify 11 green、typecheck clean、billing/capture/ai 223 green 回帰なし。
- ⏳ Phase 2 (pricing ¥100=10・qty cap / checkout requireLinked 撤廃 / webhook 10× / status): 未着手
- ⏳ Phase 3 (schema `pdfUnlocked` drop migration — db:generate + Neon dev branch apply): 未着手
- ⏳ Phase 4 (frontend: QuotaModal 購入導線 / PWYW・PDF UI 削除 / link gating 削除 / mustLink フィールド完全除去): 未着手
- ⏳ Phase 5 (export 機能削除 + spam-check fingerprint-cap を guest-provision に一元化 [R2]): 未着手
- ⏳ Phase 6 (docs 追従: concept §1.1 UC3 / §1.3.1 / §5): 未着手

## 採用方針 (可逆性優先, principle 14)
- mustLink フィールドは Phase 1 では削除せず恒久 false に。EffectiveQuota 型・status.ts・billing hooks/api・CaptureContainer の cascade を一度に壊さず green を維持。完全除去は Phase 4 で実施 (spec-review R1)。

## Decisions

```yaml
- id: D20260526-021
  timestamp: 2026-05-26T10:24:00+09:00
  command: /flow:tdd
  phase: Phase 1 前 (spec-review R3 解決)
  question: trial.ts/spam-guard は identify enforcement 経路に到達するか
  options: [identify 経路にある→flip 要, spam-check 専用→Phase1 スコープ外]
  recommended: spam-check 専用
  chosen: spam-check 専用 (checkTrialQuota の唯一 caller は api/auth/spam-check.ts)。identify は effectiveQuota のみ
  chosen_type: auto-recommended
  depends_on: [D20260526-016]
  context: |
    grep: checkTrialQuota caller = spam-check.ts のみ。spam-guard は getFingerprint のみ import。
    → trial.ts mustLink は濫用制御 (R2/Phase5)、Phase1 quota 変更は EffectiveQuota に限定して安全。

- id: D20260526-022
  timestamp: 2026-05-26T10:25:00+09:00
  command: /flow:tdd
  phase: Phase 1 TDD (quota core + identify)
  question: mustLink フィールドを Phase 1 で除去するか恒久 false にするか
  options: [即除去 (cascade 全更新), 恒久 false 残置 (後続 Phase で除去)]
  recommended: 恒久 false 残置
  chosen: 恒久 false 残置 (可逆性優先, principle 14)。identify は常に 402、frontend cascade は Phase 4 で除去
  chosen_type: auto-recommended
  depends_on: [D20260526-021]
  context: |
    EffectiveQuota.mustLink を即除去すると status/billing hooks/CaptureContainer が一斉に壊れる。
    恒久 false なら behavior (402/購入導線) を即達成しつつ green 維持。除去は Phase 4。
```

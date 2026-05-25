# Postmortem: 新規ゲストが無料枠を 1 度も使えない (trial 未配線)

> **重大度**: high
> **発生日 / 対応完了日**: 2026-05-25 (同日)
> **入力**: 000/001/002

## 1. 概要
匿名 trial (生涯3回) が identify quota 経路に配線されておらず、全新規ユーザーが初回識別で「使い切り」表示。コア体験 (撮るだけで名前) が誰にも届かない状態だった。実効 quota 層を新設して解消。

## 2. 時系列
| 時刻 | イベント | 対応 |
|---|---|---|
| ~18:5x | release Phase 2 で匿名サインイン実装 (revise_001) → session 成立 | 撮影フローに到達できるように |
| ~19:09 | ユーザー実機: 画像選択で即「使い切り」 (スクショ) | /flow:claim 起票 |
| ~19:16 | 三項照合で bug 判定 (SPEC「or trial」≠ 実装) | /flow:fix へ |
| ~19:31 | effectiveQuota + identify + frontend 配線、932 green | 実装完遂 |

## 3. 影響範囲
- 影響ユーザー: 全新規ユーザー (匿名スタート全員)。本番未公開のため実被害ユーザー 0。
- データ損失: なし / ダウンタイム: なし / セキュリティ: なし

## 4. 検知の経緯
開発者の実機検証 (release Phase 2 のローカル目視)。**865 unit (mock) は通過していた** — 各半分 (trial 機構 / identify quota) は個別に unit 済だが、両者を繋ぐ結合観点のテストが無く mock では露見しなかった。

## 5. 対応の流れ
claim 三項照合 (bug 判定) → fix で実効 quota 層 (effectiveQuota + fetchEffectiveQuota) を新設し identify/billing/frontend を単一ロジックに統合 → 932 green。

## 6. 直接原因 + 根本原因
(001 参照) identify quota が ai_credits_remaining 単独で trial 不参照。根本 = 複数無料枠概念を繋ぐ "実効 quota" 層の欠落 (SPEC「or trial」が実装で分断)。

## 7. 学習事項
### 良かった点
- 匿名サインイン実装直後の実機検証で即発見。claim→fix の三項照合で「bug (SPEC 通りでない)」と明確に切り分け。
- 修正時に `ANON_TRIAL_MAX` を auth/trial 単一源から import し、二重定義 drift を回避 (同種バグの再発防止)。

### 改善点
- 「設計が複数モジュールに跨る無料枠/quota」のような**横断ロジックは、各半分の unit だけでなく結合 (新規ユーザーが実際に識別できる) のテストを設計時に要求すべき**。
- mock unit が全 green でも「実フローが通る」保証にはならない (実機/E2E が必須)。

## 8. 再発防止策
| 対策 | 種別 | 担当 | 期限 |
|---|---|---|---|
| 「新規匿名が identify できる/枠超過で link」を E2E に追加 (E2E-AI-Q01/Q02) | テスト | flow:e2e | preview deploy 前 |
| 複数モジュール跨ぎの quota/無料枠は "実効値を算出する単一層" を必須化 (今回 api/_lib/quota.ts) | 設計 | — | 反映済 |
| 共有ビジネス定数 (上限値) は単一源 import を徹底 (ANON_TRIAL_MAX) | レビュー | — | 反映済 |
| SPEC §4「or trial」の実装分担を明記 (follow-up) | ドキュメント | flow:concept/secure | α 前 |

## 9. 関連リンク
- claim: ../claim_001_20260525_guest-trial-quota/001_TRIAGE.md
- 実装: src/shared/ai/quota.ts (effectiveQuota), api/_lib/quota.ts, api/identify-plant.ts, api/billing/status.ts

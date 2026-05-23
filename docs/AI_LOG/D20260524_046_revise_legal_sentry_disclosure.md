# D20260524_046 — /flow:revise legal sentry-disclosure (プラポリ Sentry PII スクラブ開示)

```yaml
session_id: D20260524_046_revise_legal_sentry_disclosure
command: /flow:revise
mode: revise
target: legal
issue: sentry-disclosure
started_at: 2026-05-24T01:10:00+09:00
last_updated: 2026-05-24T01:25:00+09:00
状態: 完了
完了ステップ一覧: [Step 1 要望取得, Step 2 Read スコープ, Step 3 SPEC, Step 4 PLAN, Step 5 UNIT_TEST, Step 6 E2E, Step 7.5 INDEX, Step 8 整合性]
dispatched_by: /flow:auto (D20260524_042 continuous loop iteration 4)
依存セッション: [D20260523_033_tdd_legal, D20260523_029_tdd__shared_analytics]
```

---

## Decisions

```yaml
- id: D20260524-019
  command: /flow:revise
  phase: Step 1.2 改修要望取得
  question: 改修要望の確定
  chosen: §8 [論点-014] (SEC-004) 法務 TODO — プラポリ §4 に Sentry PII スクラブ後送信を明記
  chosen_type: auto-recommended
  context: SEC-004 closure の法務側 (api wiring は Phase 3.5)、α 公開前必須
  depends_on: [D20260523-029 系 (SEC-004 scrubber 実装)]

- id: D20260524-020
  command: /flow:revise
  phase: Step 2.2 Read スコープ
  question: Read 範囲
  chosen: privacy_policy.md (§4/§5/version) + versions.ts (LATEST_VERSIONS) + legal SPEC 主要節
  chosen_type: auto-recommended
  context: 法務文書 + version 定数の局所改修、コード全読み不要

- id: D20260524-021
  command: /flow:revise
  phase: Step 3.1 改修固有 5 項目 (auto-pick)
  question: 改修方針
  chosen: >
    A 動機=SEC-004 委託先 PII 開示の法令対応。B 後方互換=互換維持 (開示追加のみ、権利縮小なし)。
    C リリース=一括。D 既存テスト=全維持 + LATEST_VERSIONS 期待値更新。
    E ロールバック=git revert (consent_logs 影響なし)。
  chosen_type: auto-recommended
  context: continuous loop のため 1問1答せず推奨採用

- id: D20260524-022
  command: /flow:revise
  phase: Step 3 [論点-001] version bump の再同意要否
  question: v1.1.0 bump で再同意を強制するか (Class C 相当)
  chosen: 案 A (v1.1.0 bump + 既存 needsReConsent で再同意要求、conservative)
  chosen_type: auto-recommended
  context: >
    委託先 PII 取扱い開示は重要事項に該当しうる → 安全側で再同意。pre-α で同意者ゼロ = 実害なし、
    既存ロジックをそのまま使え追加実装不要。最終確認は seiji (SPEC §9 [論点-001] に明記)。
```

## 生成・更新ファイル
- `docs/legal/revise_sentry_disclosure_20260524/` 4 文書 (README/INDEX/001-004)
- `docs/legal/INDEX.md` サブフォルダ行追加
- `docs/INDEX.md` legal 改修件数 0→1
- `docs/concept.md` §8 [論点-014] 法務 TODO に revise 設計完了を追記
- 本 AI_LOG セッション + AI_LOG/INDEX.md

## 完了サマリ
```
/flow:revise legal sentry-disclosure 完了:
- 改修種別: 法務文書改訂 (legal-required)
- 影響度: 中 (privacy_policy.md + versions.ts)、後方互換=互換維持
- 変更: §4 に PII スクラブ後送信を明記、v1.0.0→v1.1.0
- 未決: [論点-001] 再同意要否 (推奨=再同意要求、最終確認 seiji)
- 次の推奨: /flow:tdd legal sentry-disclosure で実装
```

## 学習・改善
- 特になし。法務文書 revise は「本文 before/after + version bump + LATEST_VERSIONS 定数 + 再同意判定」の定型。perspectives 更新不要。

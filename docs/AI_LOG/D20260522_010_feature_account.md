# AI_LOG セッション D20260522_010 — /flow:feature (account)

**実行日時**: 2026-05-22 11:40 (+09:00)
**コマンド**: /flow:feature (連続設計モード、--auto)
**対象**: account (feature、優先度 3)
**状態**: 完了
**含まれる decision**: D20260522-074 〜 D20260522-080

## 主要決定サマリ
| ID | テーマ | 採用 |
|---|---|---|
| D20260522-074 | 対象選定 | account |
| D20260522-075 | タグ | feature / auth-required / settings |
| D20260522-076 | 設定画面構成 | 1 ページに section 並列 (アカウント / 通知 / 位置情報精度 / AI 同意 / プライバシー / データ削除) |
| D20260522-077 | OAuth リンク誘導 | 起動時自動誘導なし、設定画面 + trial 超過時 + 課金時のみ表示 |
| D20260522-078 | データ削除フロー | 二段階確認 + 30 日 grace period (取消可能) + cron 削除、データは Storage object も含めて全削除 |
| D20260522-079 | 通知設定 | MVP は Web Push なし → 通知タブ自体を表示しない (将来 [論点-002] 解決後に拡張) |
| D20260522-080 | E2E_TEST 生成 | 生成 (UC1-5 を網羅) |

## Decisions

```yaml
- id: D20260522-074
  timestamp: 2026-05-22T11:40:00+09:00
  command: /flow:feature
  phase: Step 0.3
  question: 次の対象
  options: ["account (recommended、優先度 3 唯一)"]
  recommended: "account"
  chosen: "account"
  chosen_type: auto-recommended
  depends_on: [D20260522-073]
- id: D20260522-075
  timestamp: 2026-05-22T11:40:00+09:00
  command: /flow:feature
  phase: Step 2
  question: タグ
  options: ["feature + auth-required + settings (recommended)"]
  recommended: 同上
  chosen: 同上
  chosen_type: auto-recommended
- id: D20260522-076
  timestamp: 2026-05-22T11:40:00+09:00
  command: /flow:feature
  phase: Step 3 Q1
  question: 設定画面構成
  options:
    - "1 ページ section 並列 (recommended、設定数少ない MVP に最適)"
    - "tab 切替 (over-engineering)"
    - "個別ページに分割"
  recommended: 案 1
  chosen: 案 1
  chosen_type: auto-recommended
- id: D20260522-077
  timestamp: 2026-05-22T11:40:00+09:00
  command: /flow:feature
  phase: Step 3 Q2
  question: OAuth リンク誘導 UX
  options:
    - "起動時は誘導なし、設定画面 + trial 超過時 + 課金時のみ (recommended、charter §1.1 整合)"
    - "起動 5 回目に誘導モーダル"
    - "起動時必ず誘導 (摩擦)"
  recommended: 案 1
  chosen: 案 1
  chosen_type: auto-recommended
  depends_on: [D20260522-022]
- id: D20260522-078
  timestamp: 2026-05-22T11:40:00+09:00
  command: /flow:feature
  phase: Step 3 Q3
  question: データ削除フロー
  options:
    - "二段階確認 + 30 日 grace period + 完全削除 (recommended、誤操作復元 + GDPR-ish 妥協点)"
    - "即時完全削除 (取消不可)"
    - "soft delete のみ (DB に残存リスク)"
  recommended: 案 1
  chosen: 案 1
  chosen_type: auto-recommended
  depends_on: []
  context: |
    30 日 grace 中は users.deleted_at が set、ログイン時に「アカウント削除予定です。取消しますか?」表示。
    grace 経過後は cron Edge Function で auth.users / public.users / discoveries / images / Storage object を完全削除。
- id: D20260522-079
  timestamp: 2026-05-22T11:40:00+09:00
  command: /flow:feature
  phase: Step 3 Q4
  question: 通知設定 (MVP)
  options:
    - "通知タブ自体を表示しない (recommended、MVP は Web Push なし)"
    - "通知タブを表示するが disabled"
  recommended: 案 1
  chosen: 案 1
  chosen_type: auto-recommended
  depends_on: [D20260522-014]
  context: 通知機能は [論点-002] で α 後再判断。
- id: D20260522-080
  timestamp: 2026-05-22T11:40:00+09:00
  command: /flow:feature
  phase: Step 6
  question: E2E_TEST 生成?
  options: ["生成 (recommended、feature)"]
  recommended: 生成
  chosen: 生成
  chosen_type: auto-recommended
```

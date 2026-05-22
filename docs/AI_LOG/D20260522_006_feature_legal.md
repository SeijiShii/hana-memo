# AI_LOG セッション D20260522_006 — /flow:feature (legal)

**実行日時**: 2026-05-22 10:32 (+09:00)
**コマンド**: /flow:feature (連続設計モード、--auto)
**対象**: legal (feature、優先度 1)
**状態**: 完了
**含まれる decision**: D20260522-046 〜 D20260522-052

## 主要決定サマリ
| ID | テーマ | 採用 |
|---|---|---|
| D20260522-046 | 対象選定 | legal |
| D20260522-047 | タグ | feature / auth-required / stateful (consent_logs append) |
| D20260522-048 | 同意 UI 方式 | 初回起動時 1 画面で plaprori + tos + ai_usage を一括 opt-in (3 チェックボックス) |
| D20260522-049 | 書類原稿の作成手段 | 自前ドラフト (テンプレ参照) + α 公開前に法務知見ある人にレビュー |
| D20260522-050 | 静的ページ配信 | Vite + React Router の `/legal/*` ルート、Markdown を React コンポーネント化 |
| D20260522-051 | 改訂時の再同意 | doc_version で管理、ログイン時に最新版を確認 → 旧版なら再同意ダイアログ |
| D20260522-052 | E2E_TEST 生成 | feature のため生成、4 UC をカバー |

## Decisions

```yaml
- id: D20260522-046
  timestamp: 2026-05-22T10:32:00+09:00
  command: /flow:feature
  phase: Step 0.3
  question: 次の対象
  options: ["legal (recommended、優先度 1 最後)"]
  recommended: "legal"
  chosen: "legal"
  chosen_type: auto-recommended
  depends_on: [D20260522-041]
- id: D20260522-047
  timestamp: 2026-05-22T10:32:00+09:00
  command: /flow:feature
  phase: Step 2
  question: タグ
  options: ["feature + auth-required + stateful (recommended)"]
  recommended: 同上
  chosen: 同上
  chosen_type: auto-recommended
  depends_on: []
  context: consent_logs INSERT に user_id 必須 (匿名 user でも OK)、append-only stateful。
- id: D20260522-048
  timestamp: 2026-05-22T10:32:00+09:00
  command: /flow:feature
  phase: Step 3 Q1
  question: 同意 UI 方式
  options:
    - "初回起動 1 画面で 3 チェックボックス一括 (recommended、起動摩擦最小化)"
    - "プラポリ → 利用規約 → AI 同意を別画面で順に"
  recommended: 案 1
  chosen: 案 1
  chosen_type: auto-recommended
  depends_on: [D20260522-022]
  context: |
    匿名スタート採用で起動 → 即撮影が目標。同意 UI も 1 画面で済ませる。
    ただし「同意した」記録は必ず consent_logs に 3 件 (doc_type 別) で残す。
- id: D20260522-049
  timestamp: 2026-05-22T10:32:00+09:00
  command: /flow:feature
  phase: Step 3 Q2
  question: 書類原稿の作成手段
  options:
    - "自前ドラフト (Iubenda / Termly テンプレ参考) + α 公開前に法務知見ある人にレビュー (recommended)"
    - "Termly / Iubenda の SaaS で生成 ($10-50/月)"
    - "弁護士にフル委託 ($300+)"
  recommended: 案 1
  chosen: 案 1
  chosen_type: auto-recommended
  depends_on: []
  context: 個人 PJ + 無料枠厳守原則。原稿は docs/legal/ に Markdown で持つ。
- id: D20260522-050
  timestamp: 2026-05-22T10:32:00+09:00
  command: /flow:feature
  phase: Step 3 Q1
  question: 静的ページ配信方式
  options:
    - "Vite + React Router の /legal/* ルート、Markdown を React コンポーネント化 (recommended)"
    - "別途静的 HTML サブサイト"
  recommended: 案 1
  chosen: 案 1
  chosen_type: auto-recommended
  depends_on: [D20260522-011]
  context: 既存 SPA に組み込み、Vercel deploy で SEO 確保。
- id: D20260522-051
  timestamp: 2026-05-22T10:32:00+09:00
  command: /flow:feature
  phase: Step 3 Q3 / 改訂時再同意
  question: 改訂時の再同意フロー
  options:
    - "doc_version 管理、ログイン時に最新版確認 → 旧版なら再同意ダイアログ (recommended)"
    - "アプリ内バナーで案内のみ (強制しない)"
  recommended: 案 1
  chosen: 案 1
  chosen_type: auto-recommended
  depends_on: []
  context: 法的に「変更後の継続利用 = 同意」だが、明示的再同意が安全。
- id: D20260522-052
  timestamp: 2026-05-22T10:32:00+09:00
  command: /flow:feature
  phase: Step 6
  question: E2E_TEST 生成?
  options: ["生成 (recommended、feature)"]
  recommended: 生成
  chosen: 生成
  chosen_type: auto-recommended
  depends_on: []
```

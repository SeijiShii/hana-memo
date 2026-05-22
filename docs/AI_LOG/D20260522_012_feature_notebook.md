# AI_LOG セッション D20260522_012 — /flow:feature (notebook)

**実行日時**: 2026-05-22 15:30 (+09:00)
**コマンド**: /flow:feature (連続設計モード、--auto)
**対象**: notebook (feature、優先度 4)
**状態**: 完了
**含まれる decision**: D20260522-088 〜 D20260522-094

## 主要決定サマリ
| ID | テーマ | 採用 |
|---|---|---|
| D20260522-088 | 対象選定 | notebook |
| D20260522-089 | タグ | feature / auth-required |
| D20260522-090 | 表示モード | タイムライン (default) / カレンダー / 地図 / 図鑑 (種別グルーピング) の 4 モード切替 |
| D20260522-091 | フィルタ | 季節 / 月 / 識別ステータス / 場所円範囲 / フリーキーワード |
| D20260522-092 | 詳細編集 | discovery 個別画面で common_name / メモ / 場所 編集可、AI 結果は履歴として残す (audit-like) |
| D20260522-093 | UGC シェア (concept §4.8.2 連携) | 月次フォトコラージュ自動生成 + 「外部にシェア」ボタン (自然な誘導、強制なし) |
| D20260522-094 | E2E_TEST 生成 | 生成 (UC2 中核 + フィルタ / 編集 / シェア全 e2e) |

## Decisions

```yaml
- id: D20260522-088
  timestamp: 2026-05-22T15:30:00+09:00
  command: /flow:feature
  phase: Step 0.3
  question: 次の対象
  options: ["notebook (recommended、capture と並行重要)"]
  recommended: "notebook"
  chosen: "notebook"
  chosen_type: auto-recommended
  depends_on: [D20260522-087]
- id: D20260522-089
  timestamp: 2026-05-22T15:30:00+09:00
  command: /flow:feature
  phase: Step 2
  question: タグ
  options: ["feature + auth-required (recommended)"]
  recommended: 同上
  chosen: 同上
  chosen_type: auto-recommended
  context: stateful タグなし (status 遷移は capture 側、notebook は閲覧主体)。
- id: D20260522-090
  timestamp: 2026-05-22T15:30:00+09:00
  command: /flow:feature
  phase: Step 3 Q1
  question: 表示モード
  options:
    - "タイムライン default + カレンダー + 地図 + 図鑑 (種別グループ) の 4 モード切替 (recommended)"
    - "タイムラインのみ (MVP 簡素)"
    - "図鑑のみ (UX 偏り)"
  recommended: 案 1
  chosen: 案 1
  chosen_type: auto-recommended
  depends_on: [D20260522-006]
  context: wants で「タイムライン / 地図 / 図鑑」が明示されていた。実装負担小 (同データを異なる sort/group)。
- id: D20260522-091
  timestamp: 2026-05-22T15:30:00+09:00
  command: /flow:feature
  phase: Step 3 Q2
  question: フィルタ機能
  options:
    - "季節 + 月 + ステータス + 場所円 + フリーキーワード (recommended)"
    - "ステータスのみ (簡素過ぎ)"
  recommended: 案 1
  chosen: 案 1
  chosen_type: auto-recommended
- id: D20260522-092
  timestamp: 2026-05-22T15:30:00+09:00
  command: /flow:feature
  phase: Step 3 Q3
  question: 詳細編集の挙動
  options:
    - "個別画面で common_name / メモ / 場所 編集可、AI 結果は履歴として残す (recommended、audit-like)"
    - "完全上書き (履歴喪失)"
    - "編集不可 (UX 劣化)"
  recommended: 案 1
  chosen: 案 1
  chosen_type: auto-recommended
  context: |
    discoveries に user_overridden_name, user_note カラム追加、AI の original_name は保持。
    ユーザーが「AI が間違えた、これはタンポポ」と訂正できる UX。
- id: D20260522-093
  timestamp: 2026-05-22T15:30:00+09:00
  command: /flow:feature
  phase: Step 3 Q4 (concept §4.8.2 連携)
  question: UGC シェア / 製品内グロース
  options:
    - "月次フォトコラージュ自動生成 + 自然な「外部にシェア」 (recommended、charter §2.2 抵触なし)"
    - "個別 discovery を 1 件ずつシェア (UGC 流出弱)"
    - "シェア機能なし (charter §1.3 違反候補)"
  recommended: 案 1
  chosen: 案 1
  chosen_type: auto-recommended
  depends_on: [D20260522-087, "concept §4.8.2"]
  context: |
    月次コラージュは「見せたくなる」成果物 (concept §4.8.2.1)。
    シェアは選択肢、強制シェアモーダル不可 (§4.8.2.5 NG)。
- id: D20260522-094
  timestamp: 2026-05-22T15:30:00+09:00
  command: /flow:feature
  phase: Step 6
  question: E2E_TEST 生成?
  options: ["生成 (recommended、UC2 中核)"]
  recommended: 生成
  chosen: 生成
  chosen_type: auto-recommended
```

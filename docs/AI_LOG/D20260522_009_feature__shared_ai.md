# AI_LOG セッション D20260522_009 — /flow:feature (_shared/ai)

**実行日時**: 2026-05-22 11:35 (+09:00)
**コマンド**: /flow:feature (連続設計モード、--auto)
**対象**: _shared/ai (cross-cutting、優先度 2)
**状態**: 完了
**含まれる decision**: D20260522-066 〜 D20260522-073

## 主要決定サマリ
| ID | テーマ | 採用 |
|---|---|---|
| D20260522-066 | 対象選定 | _shared/ai |
| D20260522-067 | タグ | cross-cutting / external-api / 基盤 |
| D20260522-068 | API 呼出方式 | Edge Function `identify-plant` で OpenAI API key を秘匿、フロントは Edge Function に呼出 |
| D20260522-069 | プロンプト戦略 | system + user message。user message に画像 + メタ (撮影日時/季節/位置/補助メモ) を構造化注入 |
| D20260522-070 | 出力 schema | JSON schema strict mode (gpt-4o-mini supports structured outputs)、植物名/学名/科属/特徴/識別信頼度/類似種 |
| D20260522-071 | フォールバック | API エラー時は discovery.status='pending'、ユーザーに「後で再試行」UI 表示。3 回 retry 後の永続失敗は 'unknown' |
| D20260522-072 | コスト最適化 | 画像 detail=low (512px tile) + max_tokens=600 で 1 回 $0.001-0.003 想定 |
| D20260522-073 | E2E_TEST 生成 | スキップ (cross-cutting + 本番 API コスト) → capture 側で間接検証 |

## Decisions

```yaml
- id: D20260522-066
  timestamp: 2026-05-22T11:35:00+09:00
  command: /flow:feature
  phase: Step 0.3
  question: 次の対象
  options: ["_shared/ai (recommended、優先度 2 最後)"]
  recommended: "_shared/ai"
  chosen: "_shared/ai"
  chosen_type: auto-recommended
  depends_on: [D20260522-065]
- id: D20260522-067
  timestamp: 2026-05-22T11:35:00+09:00
  command: /flow:feature
  phase: Step 2
  question: タグ
  options: ["cross-cutting + external-api + 基盤 (recommended)"]
  recommended: 同上
  chosen: 同上
  chosen_type: auto-recommended
- id: D20260522-068
  timestamp: 2026-05-22T11:35:00+09:00
  command: /flow:feature
  phase: Step 3 Q1
  question: OpenAI API 呼出方式
  options:
    - "Edge Function 経由 (recommended、API key 秘匿 + rate limit 集中管理)"
    - "フロント直接呼出 (key 露出)"
  recommended: 案 1
  chosen: 案 1
  chosen_type: auto-recommended
  depends_on: [D20260522-012]
- id: D20260522-069
  timestamp: 2026-05-22T11:35:00+09:00
  command: /flow:feature
  phase: Step 3 Q2
  question: プロンプト構造
  options:
    - "system + user (画像 + 構造化メタ) (recommended)"
    - "single user message に全部混ぜる (gpt の指示遵守が落ちる)"
  recommended: 案 1
  chosen: 案 1
  chosen_type: auto-recommended
  context: |
    system に「日本国内の植物識別のエキスパート、JSON で返答」を固定。
    user message に画像 (image_url) と構造化メタ (撮影日時 / 季節 / おおまかな位置 / 補助メモ) を含める。
- id: D20260522-070
  timestamp: 2026-05-22T11:35:00+09:00
  command: /flow:feature
  phase: Step 3 Q3
  question: 出力 schema
  options:
    - "JSON Schema strict mode (gpt-4o-mini 対応、recommended)"
    - "free form text + regex 抽出 (壊れやすい)"
  recommended: 案 1
  chosen: 案 1
  chosen_type: auto-recommended
  context: |
    Schema: {common_name, scientific_name, family, genus, key_features:[], confidence: 0-1, similar_species:[]}.
    confidence < 0.6 で discovery.status='pending' とする閾値ロジック。
- id: D20260522-071
  timestamp: 2026-05-22T11:35:00+09:00
  command: /flow:feature
  phase: Step 3 Q4
  question: フォールバック / 失敗時の状態
  options:
    - "Edge Function 内で retry 3 → 失敗時 pending status、UI から再試行可能 (recommended)"
    - "失敗時即 'unknown' 確定 (UX 劣化)"
    - "失敗時クライアントで別 AI に fallback (複雑化)"
  recommended: 案 1
  chosen: 案 1
  chosen_type: auto-recommended
  context: |
    1 回目失敗 → 30 分後 cron で再試行も可能 (将来拡張)。
    手動再試行は UI で「もう一度識別」ボタンから capture.retryIdentify を呼ぶ。
- id: D20260522-072
  timestamp: 2026-05-22T11:35:00+09:00
  command: /flow:feature
  phase: Step 3 Q5
  question: コスト最適化
  options:
    - "image detail=low + max_tokens=600 (recommended、~$0.002/回)"
    - "image detail=high + max_tokens=1200 (~$0.01/回、精度わずか向上)"
  recommended: 案 1
  chosen: 案 1
  chosen_type: auto-recommended
  context: |
    detail=low (512x512 tile) でも植物識別精度は実用十分との社内テスト想定。
    detail=high は $30/月予算で 3000 回 → MVP では over kill。
    精度不足が α テストで判明したら detail=auto 切替。
- id: D20260522-073
  timestamp: 2026-05-22T11:35:00+09:00
  command: /flow:feature
  phase: Step 6
  question: E2E_TEST 生成?
  options: ["スキップ (cross-cutting + 本番 API コスト)"]
  recommended: スキップ
  chosen: スキップ
  chosen_type: auto-recommended
```

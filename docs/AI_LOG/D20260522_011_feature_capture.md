# AI_LOG セッション D20260522_011 — /flow:feature (capture)

**実行日時**: 2026-05-22 11:45 (+09:00)
**コマンド**: /flow:feature (連続設計モード、--auto)
**対象**: capture (feature、優先度 4)
**状態**: 完了
**含まれる decision**: D20260522-081 〜 D20260522-087

## 主要決定サマリ
| ID | テーマ | 採用 |
|---|---|---|
| D20260522-081 | 対象選定 | capture |
| D20260522-082 | タグ | feature / auth-required / external-api / stateful |
| D20260522-083 | 撮影 UI | ネイティブ camera input (capture="environment") + 撮影後プレビュー / 任意で再撮影 |
| D20260522-084 | フロー設計 | 撮影 → WebP 変換 (helpers/image) → Storage upload → discovery INSERT (status=identifying) → AI 識別 → DB 更新 → 詳細画面 |
| D20260522-085 | 位置情報 | navigator.geolocation で取得 → user_settings.location_precision に従って 100m 丸め or 完全 OFF |
| D20260522-086 | エラー UX | identifying 中の途中離脱は OK (バックグラウンド継続)、識別完了で通知バナー (in-app) |
| D20260522-087 | E2E_TEST 生成 | 生成 (UC1 中核フロー全 e2e) |

## Decisions

```yaml
- id: D20260522-081
  timestamp: 2026-05-22T11:45:00+09:00
  command: /flow:feature
  phase: Step 0.3
  question: 次の対象
  options: ["capture (recommended、優先度 4 先頭、UC1 中核)"]
  recommended: "capture"
  chosen: "capture"
  chosen_type: auto-recommended
- id: D20260522-082
  timestamp: 2026-05-22T11:45:00+09:00
  command: /flow:feature
  phase: Step 2
  question: タグ
  options: ["feature + auth-required + external-api + stateful (recommended)"]
  recommended: 同上
  chosen: 同上
  chosen_type: auto-recommended
- id: D20260522-083
  timestamp: 2026-05-22T11:45:00+09:00
  command: /flow:feature
  phase: Step 3 Q1
  question: 撮影 UI 実装
  options:
    - "<input type='file' accept='image/*' capture='environment'> + プレビュー + 再撮影 (recommended、PWA 標準)"
    - "getUserMedia 自前 camera (UX 高度だが workload 大)"
    - "外部ライブラリ (react-webcam) を使う"
  recommended: 案 1
  chosen: 案 1
  chosen_type: auto-recommended
  context: |
    PWA + iOS Safari で確実に動く方法。撮影 UI は OS native に委譲。
    MVP 後 UX フィードバックで getUserMedia 化を検討。
- id: D20260522-084
  timestamp: 2026-05-22T11:45:00+09:00
  command: /flow:feature
  phase: Step 3 Q2
  question: 識別フロー全体
  options:
    - "撮影 → WebP 変換 → Storage upload → discovery INSERT (status=identifying) → AI 呼出 → DB 更新 → 詳細画面 (recommended、原子的かつ非同期化容易)"
    - "撮影 → AI 呼出だけ先 → 結果と画像を同時保存"
  recommended: 案 1
  chosen: 案 1
  chosen_type: auto-recommended
  depends_on: [D20260522-071]
  context: |
    discovery INSERT を先に行うことで、識別失敗時も pending として残せる。
    また、Storage upload が成功して identify が失敗しても、画像は失われない。
- id: D20260522-085
  timestamp: 2026-05-22T11:45:00+09:00
  command: /flow:feature
  phase: Step 3 Q3 / 論点-004
  question: 位置情報取得・保存粒度
  options:
    - "navigator.geolocation + user_settings.location_precision で丸め (recommended)"
    - "常に precise"
    - "常に OFF"
  recommended: 案 1
  chosen: 案 1
  chosen_type: auto-recommended
  depends_on: [D20260522-016, D20260522-019]
  context: |
    粒度ロジックは _shared/helpers/location.ts に集約。
    user_settings.location_precision='off' のとき location は null として保存。
- id: D20260522-086
  timestamp: 2026-05-22T11:45:00+09:00
  command: /flow:feature
  phase: Step 3 Q4
  question: 識別中の UX
  options:
    - "識別中も他画面に遷移 OK、完了で in-app バナー通知 (recommended)"
    - "識別中はモーダルで操作 block"
  recommended: 案 1
  chosen: 案 1
  chosen_type: auto-recommended
  context: 5 秒待たせるより、撮影 → 一覧へ戻る → notebook で結果確認の方が UX 自然。
- id: D20260522-087
  timestamp: 2026-05-22T11:45:00+09:00
  command: /flow:feature
  phase: Step 6
  question: E2E_TEST 生成?
  options: ["生成 (recommended、UC1 中核)"]
  recommended: 生成
  chosen: 生成
  chosen_type: auto-recommended
```

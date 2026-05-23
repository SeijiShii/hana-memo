# 実装レポート: memory (UI 非依存コア)

## 実装日時
2026-05-23 18:22 (JST)

## モード
feature — **UI 非依存のレコメンドロジックのみ実装**。「去年の今頃」バッジ + カルーセル React UI + localStorage キャッシュ + 実 DB SELECT は app bootstrap フェーズへ defer。

## 関連ドキュメント
- [001_memory_SPEC.md](./001_memory_SPEC.md) / [002_memory_PLAN.md](./002_memory_PLAN.md) / [003_memory_UNIT_TEST.md](./003_memory_UNIT_TEST.md)
- [AI_LOG](../AI_LOG/D20260523_039_tdd_memory.md)

## 変更一覧

### 実装 (純関数)
- `src/features/memory/recommend.ts` (新規): `lastYearWindow` (前年同日 ±15 日) + `selectLastYearMemories` (identified + 期間 + 最新順 + 最大 5、E-ME-002/003 で空配列) + `hasMemories` + `memoryCacheKey` (日次)。日付計算は `_shared/helpers/date` (addDays/parseISO/formatDate) 再利用。
- `src/features/memory/index.ts` (新規): barrel。

## 実装計画からの差分

| 項目 | 内容 |
|------|------|
| 計画にない追加変更 | レコメンド選定を純関数化 (前年ウィンドウ + identified フィルタ + 最新順 + 上限)。 |
| 計画から省略した変更 | **defer (app bootstrap)**: 「去年の今頃」バッジ + 横スクロールカルーセル React UI (notebook TimelineView 統合)、localStorage 当日キャッシュ (TTL 24h)、実 DB SELECT (前年 ±15 日 fetch、E-ME-001 silent fail)。 |
| 想定外の問題と対処 | 「去年の今頃」を日付ウィンドウ (前年同日 ±15 日) で厳密定義。季節は同期間で自然に一致するため date-window のみで判定。 |

## PR Description

### タイトル
memory: 「去年の今頃」レコメンドロジック

### 概要
季節レコメンド機能のうち UI 非依存のロジック (前年同期間ウィンドウ計算、identified discovery 選定、日次キャッシュキー) を実装。バッジ/カルーセル React UI + localStorage + 実 DB は app bootstrap フェーズへ。

### テスト
- 9 tests pass、memory 行 97.29% / 分岐 88.88% (recommend.ts 中核 100%)
- 全体 373/373 pass、typecheck clean

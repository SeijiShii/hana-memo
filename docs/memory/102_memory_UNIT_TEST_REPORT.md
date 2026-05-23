# 単体テストレポート: memory (UI 非依存コア)

## 実施日時
2026-05-23 18:22 (JST)

## 関連ドキュメント
- [003_memory_UNIT_TEST.md](./003_memory_UNIT_TEST.md)

## テスト実行環境
- Node 20 / Vitest 2.1.9 (`environment: node`)

## テスト結果

| # | テストケース | テストファイル | 結果 |
|---|------------|-------------|------|
| UC1 | lastYearWindow 前年同日 ±15 日 | recommend.test.ts | ✅ |
| UC2 | selectLastYearMemories 最新順 / identified 除外 / 期間外除外 | recommend.test.ts | ✅ |
| UC2 | 最大 5 件 (MEMORY_MAX_ITEMS) | recommend.test.ts | ✅ |
| E-ME-002/003 | 前年 0 件 / 今年のみ → 空配列 | recommend.test.ts | ✅ |
| UC1 | hasMemories 0/1+ / memoryCacheKey 日次 | recommend.test.ts | ✅ |

## サマリー

| 項目 | 値 |
|------|-----|
| 合計テスト数 | 9 件 |
| 成功 | 9 件 / 失敗 0 件 / 成功率 100% |
| memory 行カバレッジ | 97.29% (目標 80% ↑) |
| memory 分岐カバレッジ | 88.88% (目標 75% ↑) |
| recommend.ts | 中核ロジック 100% |

## カバレッジ未達・補足
- `index.ts` (barrel) 0%: re-export のみ。
- **defer (本レポート対象外)**: 「去年の今頃」バッジ + カルーセル React UI (notebook 統合)、localStorage 当日キャッシュ、実 DB SELECT (E-ME-001 silent fail)。app bootstrap フェーズで jsdom + 実 DB にて実施。

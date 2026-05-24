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
- ~~defer~~ → **データ層は Phase 3.5 Milestone B で解消** (下記追記)。バッジ/カルーセル UI は Milestone C。

---

## 追記: Phase 3.5 Milestone B glue テスト (2026-05-24, `/flow:auto` 反復8)

| # | テストケース | テストファイル | 結果 |
|---|------------|-------------|------|
| (fetch) | fetchMemories GET → memories / 失敗 throw | src/features/memory/memoryApi.test.ts | ✅ |
| (cache) | write→read 当日キー / 翌日 miss (TTL 24h) / 壊れ JSON null | 同上 | ✅ |
| (cache hit) | useMemories キャッシュ hit → fetch しない | src/features/memory/hooks.test.tsx | ✅ |
| (cache miss) | miss → fetch → writeCache + memories セット | 同上 | ✅ |
| E-ME-001 | fetch 失敗 → silent fail (memories=[], show=false) | 同上 | ✅ |
| E-ME-003 | 0 件 → show=false | 同上 | ✅ |

### glue サマリー

| 項目 | 値 |
|------|-----|
| 追加テスト数 | 9 件 (合計 18 件) |
| 全体テスト | **607/607 pass** (was 598)、成功率 100% |
| typecheck / eslint | 0 / 0 |

### 残 (Milestone C / E2E)
- 「去年の今頃」バッジ + 横スクロールカルーセル React UI (notebook TimelineView 統合) は presentation のため Playwright E2E。
- recommend handler default export (DB dynamic import 部) は単体非対象、Milestone C E2E でカバー。

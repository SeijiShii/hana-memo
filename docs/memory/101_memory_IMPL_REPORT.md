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

---

## 追記: Phase 3.5 Milestone B — レコメンド データ層 glue (2026-05-24, `/flow:auto` 反復8)

defer 済のデータ IO + localStorage キャッシュ + hook を wiring (tested core `selectLastYearMemories` 再利用)。「去年の今頃」バッジ + カルーセル React UI は presentation のため **Milestone C** (notebook TimelineView 統合)。

### 追加実装 (Vercel Function / api/memory/)
- `api/memory/recommend.ts` (新規、GET): `lastYearWindow` で前年 ±15 日を算出し DB から identified discovery を取得 → `selectLastYearMemories` (最新順・最大 5)。soft-delete 除外 + user_id スコープ ([SEC-005])。

### 追加実装 (frontend / src/features/memory/)
- `memoryApi.ts` (新規): `fetchMemories` (GET) + `readMemoryCache`/`writeMemoryCache` (localStorage、`memoryCacheKey` 日付込み = 1 日 1 回再計算 TTL 24h 相当)。
- `hooks.ts` (新規): `useMemories` — 当日キャッシュ hit → 即返却 / miss → fetch → cache。fetch 失敗は **silent fail (E-ME-001)** で memories=[] (バッジ非表示、ページ非破壊)。
- `index.ts` (追記): glue 再輸出。

### glue テスト結果
- 新規 9 tests pass (memoryApi 5 / hooks 4)
- 全体 **607/607 pass** (was 598)、typecheck 0 / eslint 0

### glue 差分メモ
- バッジ/カルーセル React UI は本反復スコープ外 (純 presentation、notebook TimelineView に統合、Milestone C)。useMemories の `memories`/`show` を描画するだけ。
- キャッシュ TTL は別実装 (`setTimeout` 等) ではなく **日付込みキー** で表現 (翌日は別キー = 自動 miss、掃除不要)。

---

## 追記: Phase 3.5 Milestone C — 去年の今頃 carousel + badge (2026-05-24, `/flow:auto` D20260524_051 反復4)

defer 済の presentation を SPEC UC1/UC2 通り実装 (data/hooks は実装済を compose、capture/notebook と同 pattern)。

### 追加ファイル (src/features/memory/components/)
- `MemoryCard.tsx` (新規): 単 card (name null→「不明」/ captured date / thumbnail or 🌿)。
- `MemorySection.tsx` (新規): 横スクロール carousel host (純 Tailwind `overflow-x-auto snap-x`、ライブラリ未使用)。h2「去年の今頃」、0 件 → 非表示 (CTA 無し、charter §2.2)、loading→「読み込み中…」。`MEMORY_SECTION_ANCHOR_ID` 輸出。
- `MemoryBadge.tsx` (新規): header count badge「去年の今頃 N」(99+ cap、0/負 → 非表示)。default tap → section へ scroll。
- `index.ts` (追記): barrel。

### 統合 (notebook)
- `NotebookPage.tsx` に memory props-seam (`memories`/`memoriesLoading`/`resolveMemoryThumbnail`/`onSelectMemory`) を追加 → header に `MemoryBadge`、body 最上部に `MemorySection` (SPEC UC2「ページ最上部」)。後方互換 (全 prop default)。

### 設計判断
- SPEC は **「去年の今頃」prior-year recall** (汎用シーズンレコメンド / 称号バッジではない) と確認 → BadgeList/milestone は SPEC に無く実装せず。
- memories は props 注入 seam (`useMemories` の token 依存を app 層で配線)。

### テスト結果
- 新規 3 file + NotebookPage 統合 / +24 tests (MemoryCard 5 / MemorySection 7 / MemoryBadge 8 / NotebookPage 統合 +4)。
- 全体 **683/683 pass** (was 659)、typecheck 0 / eslint 0。

### 残 (browser 実機検証 + app 層配線)
- carousel 横スクロール / snap の操作感、badge scroll-to-section 挙動、視覚レイアウト。
- `useMemories({token})` + `resolveMemoryThumbnail` (signed URL) の app 層配線。
- 各 004 ジャーニー E2E (`docs/E2E_GATE_STATUS_20260524.md`)。

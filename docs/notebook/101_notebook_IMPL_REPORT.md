# 実装レポート: notebook (UI 非依存コア)

## 実装日時
2026-05-23 18:13 (JST)

## モード
feature — **UI 非依存のデータロジック (フィルタ / 編集 / グルーピング) のみ実装**。4 モード React view + 詳細編集 UI + コラージュ canvas + OG image + Realtime + 実 DB は app bootstrap フェーズへ defer。

## 関連ドキュメント
- [001_notebook_SPEC.md](./001_notebook_SPEC.md) / [002_notebook_PLAN.md](./002_notebook_PLAN.md) / [003_notebook_UNIT_TEST.md](./003_notebook_UNIT_TEST.md)
- [AI_LOG](../AI_LOG/D20260523_036_tdd_notebook.md)

## 変更一覧

### 実装 (純関数)
- `src/features/notebook/errors.ts` (新規): `NotebookError`。
- `src/features/notebook/types.ts` (新規): `NotebookDiscovery` (表示・フィルタ用の構造的サブセット)。
- `src/features/notebook/filter.ts` (新規): `matchesFilter`/`filterDiscoveries` (季節/月/status/場所円/keyword の AND) + `clampRadiusKm` (0.1〜100km)。場所円は `_shared/helpers/location haversineDistance` 再利用。
- `src/features/notebook/edit.ts` (新規): `sanitizeCommonName` (100) / `sanitizeNoteField` (500) / `validateLocation` (lat/lng 範囲) / `resolveDisplayName` (user 編集値 > AI 値 > original > 不明) / `buildEditRecord` (append-only audit)。
- `src/features/notebook/grouping.ts` (新規): `sortByCapturedAtDesc` (非破壊) / `groupBySpecies` (図鑑モード)。
- `src/features/notebook/index.ts` (新規): barrel。

## 実装計画からの差分

| 項目 | 内容 |
|------|------|
| 計画にない追加変更 | 表示名解決 (resolveDisplayName) を純関数化 (user_overridden_name > common_name > original)。 |
| 計画から省略した変更 | **defer (app bootstrap)**: 4 モード React view (timeline/calendar/map/figure)、詳細・編集 UI、無限スクロール、月次コラージュ canvas + Web Share + OG image Edge Function (UC6)、useSignedUrl 画像表示、Realtime、実 DB SELECT/UPDATE/soft-delete + discovery_edits INSERT。 |
| 想定外の問題と対処 | フィルタ対象を `NotebookDiscovery` 構造サブセット型で受け、schema 全体への結合を回避 (テスト容易性 + DB 非依存)。 |

## PR Description

### タイトル
notebook: フィルタ + 編集 + グルーピングのデータロジック

### 概要
発見ノートのうち UI 非依存のデータロジック (季節/月/status/場所円/keyword フィルタ、編集検証・表示名解決・編集監査ログ、種別グルーピング・時系列ソート) を実装。4 モード view + コラージュ + 実 DB は app bootstrap フェーズへ。

### テスト
- 20 tests pass、notebook 行 98.85% / 分岐 96.22% (errors/filter 100%、edit 100% line)
- 全体 329/329 pass、typecheck clean

---

## 追記: Phase 3.5 Milestone B — ノート データ層 UI glue wiring (2026-05-24, `/flow:auto` 反復6)

defer 済のデータ IO + hooks を wiring (tested core: filter/edit/grouping は injectable のまま再利用)。4 モード view (timeline/calendar/map/figure) + コラージュ canvas + OG image は **presentation/browser API のため Milestone C (Playwright E2E)** に残置。

### 追加実装 (Vercel Function / api/notebook/)
- `api/notebook/list.ts` (新規、GET cursor pagination): user の discoveries を capturedAt 降順 page 取得。`deleted_at IS NULL` + user_id スコープ ([SEC-005]、UT-NB-D06/D07)。limit clamp 1..100、nextCursor で無限スクロール。
- `api/notebook/edit.ts` (新規): PATCH `parseEditBody` (common_name/user_note/location 検証) → discoveries UPDATE + discovery_edits INSERT (before/after audit、UT-NB-A01/A02)。DELETE `?id` → deleted_at soft-delete (UT-NB-A03)。更新 0 件 (他 user) は 404 = 実質 RLS reject (UT-NB-E01)。

### 追加実装 (frontend / src/features/notebook/)
- `notebookApi.ts` (新規): fetchDiscoveries (cursor) / updateDiscovery / softDeleteDiscovery。
- `hooks.ts` (新規): `useNotebook` (page 蓄積 + filterDiscoveries + sortByCapturedAtDesc + groupBySpecies、loadMore/refresh、D01-D03) / `useDiscoveryEdit` (edit/remove + onMutated)。
- `index.ts` (追記): glue 再輸出。

### glue テスト結果
- 新規 20 tests pass (notebookApi 7 / hooks 7 / edit parse 6)
- 全体 **586/586 pass** (was 566)、typecheck 0 / eslint 0

### glue 差分メモ
- フィルタは server PostGIS ではなく page 取得 + tested core `filterDiscoveries` を frontend hook で適用 (MVP DAU 規模で十分、server-side filter 化は Milestone C 検討)。
- 4 モード view / コラージュ / Web Share / OG image は本反復のスコープ外 (純 presentation + canvas/browser API)。useNotebook の `discoveries`/`groups` を描画する薄い層として Milestone C で追加。
- 元 PLAN の Realtime → 不採用 (useNotebook.refresh / 編集後 onMutated で再取得)。

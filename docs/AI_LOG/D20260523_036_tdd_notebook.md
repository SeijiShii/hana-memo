# D20260523_036 — /flow:tdd notebook (UI 非依存コア)

```yaml
session_id: D20260523_036_tdd_notebook
command: /flow:tdd
mode: feature (UI 非依存コアのみ、4 モード React view / collage / share は defer)
target: notebook
started_at: 2026-05-23T18:12:00+09:00
last_updated: 2026-05-23T18:13:00+09:00
状態: 完了 (UI 非依存コア)
完了ステップ一覧: [Step 1-4 判定, Step 5 実装, Step 6 全テスト, Step 7 レポート, Step 9 INDEX, Step 10 整合性, Step Z commit]
依存セッション: [D20260522_012_feature_notebook, D20260523_035_tdd_capture]
dispatched_by: /flow:auto (continuous loop iteration 8)
備考: D20260523-104 全テスト 20 pass、全体 329/329、notebook 行 98.85% / 分岐 96.22%。円フィルタは helpers haversineDistance 再利用
```

---

## Step 1-4: スコープ

`notebook` は閲覧 (4 モード) + フィルタ + 編集 + コラージュ。UI 非依存のデータロジックを実装:

### 実装 (今回、純関数)
| ファイル | 責務 | 対応テスト |
|---|---|---|
| `errors.ts` | NotebookError | E-NB-003 系 |
| `filter.ts` | matchesFilter / filterDiscoveries (季節/月/status/円/keyword) + clampRadiusKm (0.1-100) | UC3 フィルタ |
| `edit.ts` | sanitizeCommonName(100) / sanitizeNoteField(500) / validateLocation (lat/lng 範囲) / resolveDisplayName / buildEditRecord | §4.1 + UC4 |
| `grouping.ts` | sortByCapturedAtDesc / groupBySpecies (図鑑モード) | UC2 図鑑 |
| `index.ts` | barrel | |

- 円フィルタは `_shared/helpers/location haversineDistance` (実装済) を再利用。

### Defer (app bootstrap、React/canvas 必要)
- 4 モード React view (timeline/calendar/map/figure)、詳細・編集 UI、無限スクロール
- 月次コラージュ canvas 生成 + Web Share + OG image Edge Function (UC6)
- useSignedUrl 画像表示、Realtime、実 DB SELECT/UPDATE/soft-delete

---

## decisions

### D20260523-103 — Step 1 スコープ (notebook UI decouple)

- **chosen_type**: auto-recommended (decouple 方針継続)
- **chosen**: filter/edit/grouping/errors コアを実装、4 モード view/collage/share/DB glue は app bootstrap へ defer
- **context**: notebook は表示・フィルタ・編集。テスト可能なデータロジック (フィルタ述語 / 編集検証 / 表示名解決 / 種別グルーピング) を切り出し、円フィルタは helpers haversineDistance 再利用

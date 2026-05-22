# notebook 単体テスト計画

> **入力**: `./001_notebook_SPEC.md`, `./002_notebook_PLAN.md`
> **最終更新**: 2026-05-22

---

## 1. テストケース

### 1.1 useDiscoveries
| ID | シナリオ | 期待 |
|---|---|---|
| UT-NB-D01 | 初回 fetch | 20 件 + nextCursor 返却 |
| UT-NB-D02 | 無限スクロール | 21-40 件目 fetch |
| UT-NB-D03 | フィルタ: 季節=春 | season='spring' のみ |
| UT-NB-D04 | フィルタ: 場所円 中心(35.0,139.0) r=5km | PostGIS ST_DWithin で絞る |
| UT-NB-D05 | フィルタ: フリーキーワード "桜" | common_name OR user_note OR scientific_name ilike |
| UT-NB-D06 | deleted_at not null | 除外 |
| UT-NB-D07 | RLS 他 user | 空 |

### 1.2 notebookApi
| ID | シナリオ | 期待 |
|---|---|---|
| UT-NB-A01 | updateDiscovery (common_name 編集) | discoveries UPDATE + discovery_edits INSERT 1 件 (before/after) |
| UT-NB-A02 | updateDiscovery (location 編集) | edit log の field_name='location' |
| UT-NB-A03 | softDelete | deleted_at = now() |
| UT-NB-A04 | discovery_edits UPDATE 試行 | RLS reject |

### 1.3 CalendarView / MapView / EncyclopediaView
| ID | シナリオ | 期待 |
|---|---|---|
| UT-NB-CV01 | 当月 30 日に 5 件マーカー | 5 件タップで一覧 |
| UT-NB-MV01 | 100 ピン以上 | クラスタ表示 |
| UT-NB-MV02 | location null は除外 | ピンに含まれない |
| UT-NB-EV01 | scientific_name 別グループ | 同種をまとめる |
| UT-NB-EV02 | unknown ステータス | 「未識別」グループ |

### 1.4 CollageCanvas / useMonthlyCollage
| ID | シナリオ | 期待 |
|---|---|---|
| UT-NB-CC01 | 9 枚 1080x1080 | canvas dataURL 返却、サイズ 1MB 以下 |
| UT-NB-CC02 | 9 枚未満 (3 件) | 残りプレースホルダ |
| UT-NB-CC03 | 0 件 | エラー「今月の記録なし」 |
| UT-NB-CC04 | モバイル Safari (canvas メモリ制限 mock) | 720x720 fallback |

### 1.5 ShareSheet
| ID | シナリオ | 期待 |
|---|---|---|
| UT-NB-SS01 | Web Share API 対応 | navigator.share 呼出 |
| UT-NB-SS02 | 未対応 | X/FB/コピー URL 各リンク表示 |

### 1.6 urlParams
| ID | シナリオ | 期待 |
|---|---|---|
| UT-NB-U01 | filter={season:'spring',month:'2026-04'} → URL | `?season=spring&month=2026-04` |
| UT-NB-U02 | URL → filter parse | 復元一致 |
| UT-NB-U03 | 半径不正値 (0 / 999) | clamp 0.1〜100 |

### 1.7 異常系・境界
| ID | 対象 | 条件 | 期待 |
|---|---|---|---|
| UT-NB-E01 | 編集中 RLS 拒否 | 他 user の discovery | reject + rollback |
| UT-NB-E02 | フィルタ全 OFF | 全件返却 |
| UT-NB-B01 | discoveries 1000 件 | TimelineView 表示 < 3s |

## 2. Mock 方針
| 対象 | 方針 |
|---|---|
| supabase | mock |
| useSignedUrl | mock URL |
| MapLibre | jsdom + lightweight stub |
| canvas | node-canvas |
| Web Share API | navigator.share mock |
| Vercel OG | mock fetch |

## 3. カバレッジ目標
| 種別 | 目標 |
|---|---|
| 行 | 80% |
| 分岐 | 75% |
| collageRenderer | 90% (UGC 重要部分) |

## 4. 実行環境
- vitest + jsdom + @testing-library/react + node-canvas

## 5. 更新履歴
| 日付 | 変更概要 | 実行者 |
|---|---|---|
| 2026-05-22 | 初版作成 | /flow:feature |

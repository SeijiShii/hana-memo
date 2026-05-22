# memory 単体テスト計画

> **入力**: `./001_memory_SPEC.md`, `./002_memory_PLAN.md`
> **最終更新**: 2026-05-22

---

## 1. テストケース

### 1.1 dateRange
| ID | シナリオ | 期待 |
|---|---|---|
| UT-ME-DR01 | today=2026-05-22, margin=15 | start=2025-05-07, end=2025-06-06 |
| UT-ME-DR02 | today=2026-01-01 (年末跨ぎ) | start=2024-12-17, end=2025-01-16 |
| UT-ME-DR03 | today=2026-02-29 (うるう年) | start=2025-02-14, end=2025-03-16 (2025 は通常年) |

### 1.2 useThisDayLastYear
| ID | シナリオ | 期待 |
|---|---|---|
| UT-ME-H01 | 前年 5 件 | items 5 件 + count=5 |
| UT-ME-H02 | 前年 0 件 | items=[], count=0 |
| UT-ME-H03 | season 不一致除外 | spring season のみ filter |
| UT-ME-H04 | pending 除外 | identified のみ |
| UT-ME-H05 | 25 件 (max 5) | items 5 件 (撮影日昇順 or 降順 - 仕様で決定) |
| UT-ME-H06 | 新規 user (登録 < 1 年) | count=0 + バッジ非表示 |
| UT-ME-H07 | RLS 他 user | 空 |

### 1.3 memoryCache
| ID | シナリオ | 期待 |
|---|---|---|
| UT-ME-C01 | cache miss → fetch | DB fetch 呼出 |
| UT-ME-C02 | cache hit (TTL 内) | DB 呼出なし |
| UT-ME-C03 | TTL expire (>24h) | refetch |
| UT-ME-C04 | 日付跨ぎ | key が変化 → refetch |
| UT-ME-C05 | localStorage 不可 (private mode) | 毎回 fetch (silent fallback) |

### 1.4 MemoryBadge / MemorySection / MemoryCard
| ID | シナリオ | 期待 |
|---|---|---|
| UT-ME-B01 | count=5 | バッジ表示 + aria-label「去年の今頃 5 件」 |
| UT-ME-B02 | count=0 | non-render |
| UT-ME-B03 | count=100 | 「99+」表記 |
| UT-ME-B04 | バッジタップ | section にスクロール |
| UT-ME-S01 | 5 件カード横スクロール | scroll-snap 動作 |
| UT-ME-C01 | カードタップ | /notebook/{id} 遷移 |

### 1.5 異常系・境界
| ID | 対象 | 条件 | 期待 |
|---|---|---|---|
| UT-ME-E01 | DB fetch 失敗 | バッジ非表示 (silent fail) |
| UT-ME-E02 | location null discovery | カード「場所不明」 |

## 2. Mock 方針
| 対象 | 方針 |
|---|---|
| Date.now | useFakeTimers |
| Supabase | mock |
| localStorage | jsdom 標準 + private mode mock |
| useSignedUrl | mock URL |

## 3. カバレッジ目標
| 種別 | 目標 |
|---|---|
| 行 | 80% |
| 分岐 | 75% |

## 4. 実行環境
- vitest + jsdom

## 5. 更新履歴
| 日付 | 変更概要 | 実行者 |
|---|---|---|
| 2026-05-22 | 初版作成 | /flow:feature |

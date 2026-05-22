# _shared/helpers 単体テスト計画

> **入力**: `./001_helpers_SPEC.md`, `./002_helpers_PLAN.md`
> **最終更新**: 2026-05-22

---

## 1. テストケース

### 1.1 date.ts
| ID | 関数 | 入力 | 期待出力 |
|---|---|---|---|
| UT-HE-D01 | formatDate yyyy-MM-dd | new Date('2026-05-22') | '2026-05-22' |
| UT-HE-D02 | formatDate M月d日 | 同上 | '5月22日' |
| UT-HE-D03 | formatDate relative | now - 1h | '1時間前' |
| UT-HE-D04 | daysBetween | (2026-05-22, 2026-05-25) | 3 |
| UT-HE-D05 | startOfMonth | 2026-05-22 12:00 | 2026-05-01 00:00 |

### 1.2 location.ts
| ID | 関数 | 入力 | 期待出力 |
|---|---|---|---|
| UT-HE-L01 | roundLocation default 100m | (35.681236, 139.767125) | (35.6812, 139.7671, precision_m=100) ※小数 4 桁 |
| UT-HE-L02 | roundLocation 1000m | 同上, 1000 | (35.681, 139.767) |
| UT-HE-L03 | roundLocation negative precision throws | -1 | TypeError |
| UT-HE-L04 | haversineDistance | (東京駅, 渋谷駅) | ~5800m (誤差 ±50m) |
| UT-HE-L05 | getCurrentLocation 拒否 → null | mock geolocation = PERMISSION_DENIED | null |

### 1.3 season.ts
| ID | 関数 | 入力 | 期待出力 |
|---|---|---|---|
| UT-HE-S01 | getCurrentSeason 5月 | new Date('2026-05-22') | 'spring' |
| UT-HE-S02 | getCurrentSeason 8月 | 2026-08-15 | 'summer' |
| UT-HE-S03 | isInSeason 桜 (March-April) | now=4月 | true |
| UT-HE-S04 | isInSeason 桜 in 7月 | now=7月 | false |
| UT-HE-S05 | getMonthsBetween 5月±30日 | (5, 30) | [4,5,6] |

### 1.4 id.ts
| ID | 関数 | 入力 | 期待出力 |
|---|---|---|---|
| UT-HE-I01 | generateUuid format | (なし) | UUIDv4 形式 (regex) |
| UT-HE-I02 | hashIp 決定性 | ('192.168.1.1', 'salt') × 2 回 | 同じ hash |
| UT-HE-I03 | hashIp salt 違うと別 | ('IP', 'A') vs ('IP', 'B') | 別 hash |

### 1.5 image.ts
| ID | 関数 | 入力 | 期待出力 |
|---|---|---|---|
| UT-HE-IM01 | toWebP 出力 mime | fixture JPEG 1MB | mime='image/webp' |
| UT-HE-IM02 | toWebP サイズ縮小 | fixture 3000x4000 | width <= 1920 |
| UT-HE-IM03 | stripExif | fixture w/ EXIF (GPS タグ含む) | EXIF 全削除 |
| UT-HE-IM04 | generateThumbnail | 同 fixture | width=320 |
| UT-HE-IM05 | toWebP 10MB OOM 防止 | 入力 > 10MB | reject Error |

### 1.6 異常系
| ID | 対象 | 失敗条件 | 期待振る舞い |
|---|---|---|---|
| UT-HE-E01 | toWebP 非画像 File | text/plain File | reject |
| UT-HE-E02 | hashIp 空 salt | salt='' | throw Error |
| UT-HE-E03 | haversineDistance 不正座標 | lat=200 | (動作するが意味不明な値、入力検証は呼び出し側責任) |

### 1.7 境界値
| ID | 対象 | 境界 | 期待振る舞い |
|---|---|---|---|
| UT-HE-B01 | roundLocation 0 度 (赤道) | (0, 0, 100) | (0, 0) |
| UT-HE-B02 | startOfMonth 1月1日 | 2026-01-01 12:00 | 2026-01-01 00:00 |
| UT-HE-B03 | daysBetween 同日 | (d, d) | 0 |
| UT-HE-B04 | season 12月→1月境界 | 12月31日 / 1月1日 | 'winter' 両方 |

## 2. Mock 方針
| 対象 | 方針 | 理由 |
|---|---|---|
| navigator.geolocation | モック (vitest jsdom + globalThis 上書き) | 実機は CI で再現困難 |
| Canvas / Image | jsdom はサポート不足 → happy-dom or jest-canvas-mock | 純粋単体での代用 |
| 時刻 (Date.now) | vi.useFakeTimers() | UT-HE-D03 (relative) で必須 |
| crypto.subtle | node:crypto polyfill (Node 18+ ネイティブ) | テスト環境差吸収 |

## 3. カバレッジ目標
| 種別 | 目標 | 根拠 |
|---|---|---|
| 行カバレッジ | 95% | 純粋関数で達成容易 |
| 分岐カバレッジ | 90% | 同上 |
| image.ts のみ | 80% | ブラウザ依存で実機検証併用 |

## 4. テスト実行環境
- vitest + happy-dom (Canvas / crypto.subtle サポート)
- 実機テスト (image.ts のみ): Playwright で別途 (E2E は呼び出し機能側で)

## 5. 更新履歴
| 日付 | 変更概要 | 実行者 |
|---|---|---|
| 2026-05-22 | 初版作成 | /flow:feature |

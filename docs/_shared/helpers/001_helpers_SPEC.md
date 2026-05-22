# _shared/helpers 仕様書

> **役割**: 純粋ユーティリティ関数群 (日付 / 画像 / 位置 / 季節 / ID)
> **タグ**: cross-cutting
> **最終更新**: 2026-05-22
> **入力アーティファクト**: `../../concept.md`, `./README.md`

---

## 1. 提供インターフェース

### 1.1 date.ts
| 関数 | シグネチャ | 説明 |
|---|---|---|
| `formatDate` | `(d: Date, fmt: 'yyyy-MM-dd' \| 'M月d日' \| 'relative') => string` | i18n は MVP では日本語のみ |
| `parseISO` | `(s: string) => Date` | ISO 8601 → Date |
| `daysBetween` | `(a: Date, b: Date) => number` | 日数差 |
| `addDays` | `(d: Date, n: number) => Date` | |
| `startOfMonth` / `endOfMonth` | `(d: Date) => Date` | タイムライン月別グループ用 |

### 1.2 image.ts
| 関数 | シグネチャ | 説明 |
|---|---|---|
| `toWebP` | `(file: File, opts?: {maxWidth?: number, quality?: number}) => Promise<Blob>` | ブラウザ Canvas で WebP 変換、デフォルト max 1920px / quality 0.85 |
| `stripExif` | `(blob: Blob) => Promise<Blob>` | EXIF データ削除 |
| `generateThumbnail` | `(blob: Blob, size?: number) => Promise<Blob>` | デフォルト 320px |
| `getImageDimensions` | `(blob: Blob) => Promise<{width, height}>` | width/height 取得 |

### 1.3 location.ts
| 関数 | シグネチャ | 説明 |
|---|---|---|
| `roundLocation` | `(lat: number, lng: number, precisionMeters?: number) => {lat, lng, precision_m}` | デフォルト 100m 丸め ([論点-004] 推奨) |
| `getCurrentLocation` | `() => Promise<{lat, lng} \| null>` | navigator.geolocation のラッパ、未許可 / エラーで null |
| `haversineDistance` | `(a: LatLng, b: LatLng) => number` | メートル距離 (地図 cluster 用) |

### 1.4 season.ts
| 関数 | シグネチャ | 説明 |
|---|---|---|
| `getMonthsBetween` | `(targetMonth: number, windowDays: number) => number[]` | 季節レコメンド対象月 (UC5 で「去年の今頃」判定) |
| `isInSeason` | `(plant: Plant, now: Date) => boolean` | season_months と現在月の照合 |
| `getCurrentSeason` | `(d: Date) => 'spring' \| 'summer' \| 'autumn' \| 'winter'` | 季節タグ用 (北半球前提、MVP は日本のみ) |

### 1.5 id.ts
| 関数 | シグネチャ | 説明 |
|---|---|---|
| `generateUuid` | `() => string` | crypto.randomUUID() のラッパ (古いブラウザフォールバック) |
| `hashIp` | `(ip: string, salt: string) => Promise<string>` | SHA-256 ハッシュ (consent_logs.ip_hash) |

## 2. 入出力
- 入力: ファイル / 数値 / Date / 文字列
- 出力: Blob / 数値 / 整形済みデータ / Promise

## 3. データモデル
新規定義なし (純粋関数)。型は `_shared/types/domain.ts` を参照 (`LatLng`, `Plant`)。

## 4. バリデーション・エラー
| 関数 | 入力チェック | 失敗時 |
|---|---|---|
| toWebP | File オブジェクトであること | reject (Error) |
| roundLocation | precisionMeters > 0 | TypeError throw |
| getCurrentLocation | (なし、ブラウザ API) | null 返却 (例外なし) |
| hashIp | salt 非空 | Error throw |

## 5. NFR + 既存連携
| 項目 | 目標値 |
|---|---|
| toWebP 処理時間 | < 1s / 3000x4000px (中位スマホ目安) |
| toWebP 出力サイズ | 元画像の 30-50% (quality 0.85) |
| roundLocation 計算 | < 1ms |
| 関数の純粋性 | 100% (副作用なし、テスト容易) |

連携: `capture` (image / location)、`notebook` (date / season)、`memory` (season)、`account` (id hashIp for consent_logs)。

## 6. タグ別追加
なし。

## 7. スコープ外
- 多言語 (i18n) — 日付フォーマットは MVP では日本語固定
- 地図描画 → `notebook` の地図モードで MapLibre 採用 (本ヘルパは座標計算のみ)
- 画像加工 (フィルタ / トリミング) → MVP 外

## 8. 未決事項

### [論点-008] `getCurrentSeason` の地域対応
- **影響範囲**: `_shared/helpers/season.ts`
- **詰めるべき問い**: 南半球ユーザー (極小だが想定) は季節が逆転する。MVP では北半球 (日本) 固定で OK か?
- **推奨**: MVP では日本固定 (北半球)、コメントで明示。海外展開時に user.timezone or location で判定追加。
- **判断期限**: `/flow:feature memory` 着手前

## 9. 更新履歴
| 日付 | 変更概要 | 実行者 |
|---|---|---|
| 2026-05-22 | 初版作成 | /flow:feature |

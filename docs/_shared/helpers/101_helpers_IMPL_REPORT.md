# 実装レポート: _shared/helpers

## 実装日時
2026-05-23 17:16 (JST)

## モード
feature (横断、対象=`_shared/helpers`)、連続実装モード継続 (iteration 3)

## 関連ドキュメント
- [001_helpers_SPEC.md](./001_helpers_SPEC.md)
- [102_helpers_UNIT_TEST_REPORT.md](./102_helpers_UNIT_TEST_REPORT.md)
- [AI_LOG](../../AI_LOG/D20260523_027_auto_continuous.md)
- revise 連動: `../ai/revise_sec_001-003_rate_limit_ssrf_20260523/` ([SEC-003] SSRF guard 反映)
- revise 連動: `../analytics/revise_sec_004_sentry_pii_scrub_20260523/` ([SEC-004] sha256Hex 反映)

## 変更一覧

### Phase 1 (軽、メイン直接、7 ファイル + 5 test)

新規ファイル:
- `src/shared/helpers/date.ts` (~50 LOC): formatDate (yyyy-MM-dd / M月d日 / relative 日本語) / parseISO / daysBetween / addDays / startOfMonth / endOfMonth
- `src/shared/helpers/location.ts` (~50 LOC): roundLocation (緯度経度別計算、100m default) / haversineDistance / getCurrentLocation (navigator wrapper)
- `src/shared/helpers/season.ts` (~40 LOC): getCurrentSeason (日本気象基準) / getMonthsBetween (UC5 ±N ヶ月ラップ対応) / isInSeason
- `src/shared/helpers/id.ts` (~40 LOC): generateUuid (crypto.randomUUID + fallback) / **sha256Hex** ([SEC-004] revise 由来) / hashIp (salted)
- `src/shared/helpers/url.ts` (~80 LOC): **assertSafeImageUrl** ([SEC-003] SSRF guard、protocol/host allowlist/private IP/DNS rebinding 防御) / **validateObjectKey** (path traversal + userId prefix 強制) / `SsrfError` / `ValidationError`
- `src/shared/helpers/image.ts` (~120 LOC): toWebP / stripExif / generateThumbnail / getImageDimensions (browser-only Canvas API、Node では throw)
- `src/shared/helpers/index.ts` (~15 LOC): barrel

テスト:
- `date.test.ts` (21 ケース): 各 format / 境界 / fake timers
- `location.test.ts` (8 ケース): 100m/1000m 丸め / haversine 東京-大阪実距離検証
- `season.test.ts` (15 ケース): 4 季節境界 / ±45 日ラップアラウンド (年末年始)
- `id.test.ts` (15 ケース): UUID 形式 / sha256 known vector ('hello' → 2cf24...) / hashIp salted
- `url.test.ts` (17 ケース): SSRF (https/host/private IP/DNS rebinding) + validateObjectKey (traversal/prefix/length/non-string)

## 実装計画からの差分

| 項目 | 内容 |
|---|---|
| 計画にない追加変更 | (1) `url.ts` 新規追加 ([SEC-003] revise 由来、SPEC §1 にはなかったが revise 設計反映)<br>(2) `sha256Hex` 追加 ([SEC-004] revise 由来、Sentry user_id hash 化 + hashIp 共通実装)<br>(3) `image.ts` を browser-only と明示、Node test 環境では呼び出し時 throw |
| 計画から省略した変更 | (1) image.ts の vitest jsdom 設定: 本セッションでは Node 環境で十分、Playwright E2E でカバー予定 |
| 想定外の問題と対処 | date 'years ago' test 期待値修正 (2024 → 2026 = 2 年前) |

## PR Description

### タイトル
_shared/helpers: date/location/season/id/url/image + SSRF guard + sha256Hex

### 概要
hana-memo の純粋ユーティリティ + セキュリティ guard。日付フォーマット (日本語 relative)、位置情報 100m 丸め (プライバシー)、季節レコメンド (UC5、年末ラップ対応)、UUID 生成、SHA-256 ハッシュ (revise sec_004 由来)、SSRF guard + objectKey 検証 (revise sec_001-003 由来)。画像処理 (Canvas) は browser-only。

### 変更内容
- date.ts: 6 関数 + 日本語 relative format
- location.ts: 100m 丸め (緯度経度別計算) + haversine + geolocation wrapper
- season.ts: 日本気象基準 4 季節 + UC5 ±N ヶ月リスト (ラップアラウンド)
- id.ts: generateUuid + **sha256Hex** ([SEC-004]) + hashIp (salted)
- url.ts: **assertSafeImageUrl** ([SEC-003] SSRF guard) + **validateObjectKey** (path traversal)
- image.ts: toWebP/stripExif/Thumbnail/Dimensions (browser-only、Node throw)
- index.ts: barrel

### テスト
- Vitest 76 ケース全 pass (累計 119/119)
- [SEC-003] SSRF guard 10 ケース確認
- [SEC-005 関連] validateObjectKey 8 ケース確認
- sha256 known vector 検証

## 次のステップ
- 累計: 3/14 完了 (_shared/{db,types,helpers})
- 次対象: `_shared/analytics` (revise SEC-004 scrubber 反映含む)

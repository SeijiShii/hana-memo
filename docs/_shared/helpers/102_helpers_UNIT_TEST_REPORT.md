# 単体テストレポート: _shared/helpers

## 実施日時
2026-05-23 17:16 (JST)

## テスト実行環境
- Node.js: v22.11.0
- Vitest: 2.1.9

## サマリ

| 項目 | 値 |
|---|---|
| 合計 | **76** ケース |
| 成功 | 76 |
| 失敗 | 0 |
| 成功率 | **100%** |
| 累計 (PJ 全体) | 119/119 pass |

## 内訳

| カテゴリ | ファイル | ケース | 主要観点 |
|---|---|---|---|
| date | date.test.ts | 21 | yyyy-MM-dd / M月d日 / relative (今日〜年前) / 月末 / 閏年 |
| location | location.test.ts | 8 | 100m/1000m 丸め / haversine 東京-大阪実距離 / 赤道境界 |
| season | season.test.ts | 15 | 4 季節境界 / UC5 ±N ヶ月ラップアラウンド (1月/12月) |
| id | id.test.ts | 15 | UUID 形式 + 一意性 / sha256 known vector / hashIp salted |
| url ([SEC-003]) | url.test.ts | 17 | SSRF (https/host/private/DNS rebinding) / validateObjectKey (traversal/prefix/length) |

## 追加テストケース

- [SEC-003] SSRF guard 10 ケース (revise sec_001-003 由来、SPEC 原本にはなかった追加観点)
- [SEC-004] sha256Hex known vector (`'hello' → 2cf24dba...`) で実装誤りを防御
- date 'relative' fake timers でテスト分離

## カバレッジ目標

| ファイル | 推定行カバレッジ |
|---|---|
| date.ts | ~95% (全分岐網羅) |
| location.ts | ~90% (geolocation API は Node 環境で 1 分岐のみテスト) |
| season.ts | ~95% |
| id.ts | ~95% |
| url.ts | ~95% (SsrfError 全分岐 + DNS injection で resolve 経路) |
| image.ts | **0% (browser-only、Playwright E2E でカバー予定)** |

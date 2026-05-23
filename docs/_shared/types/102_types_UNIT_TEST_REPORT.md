# 単体テストレポート: _shared/types

## 実施日時
2026-05-23 17:10 (JST)

## テスト実行環境
- Node.js: v22.11.0
- Vitest: 2.1.9

## テスト結果サマリ

| 項目 | 値 |
|---|---|
| 合計テスト数 | **15** |
| 成功 | 15 |
| 失敗 | 0 |
| 成功率 | **100%** |
| 累計 (PJ 全体) | 43/43 pass |

## テスト内訳

| カテゴリ | ケース | 件数 |
|---|---|---|
| 型 alias compile check | DiscoveryStatus / BillingType / LocationPrecision / Season / BillingSku | 5 |
| Shape validation | User / Discovery | 2 |
| AI I/O | IdentifyInput / IdentifyResult | 2 |
| Analytics | CostLogEntry | 1 |
| Type guards | isRateLimitedError ×3 / isValidationError ×2 | 5 |

## 追加テストケース
- isRateLimitedError / isValidationError type guards のテストは SPEC §1.2 にはなかったが、api.ts 新規追加に伴い追加 (5 ケース)

## カバレッジ目標
- 型のみのモジュールのため runtime カバレッジは type guards (api.ts) の 100%
- compile-time check は tsc strict mode で確保 (`npm run typecheck` で別途実行可能)

# 単体テストレポート: _shared/db revise sec_007_drizzle_orm_sqli

## 実施日時
2026-05-24 06:03 (JST)

## 関連ドキュメント
- [003_REVISE_UNIT_TEST.md](./003_REVISE_UNIT_TEST.md) — 単体テスト計画

## テスト実行環境
- Node.js: 20
- Vitest: 2.1.9
- drizzle-orm: 0.45.2 (アップグレード後)
- drizzle-kit: 0.31.10 (アップグレード後)

## テスト結果

本改修は依存アップグレードであり振る舞い不変のため、**新規テストは追加せず既存スイート全件の green 維持を回帰ゲートとする**。

| # | テストスイート | 結果 | 備考 |
|---|---|---|---|
| 1 | `src/shared/db/schema.test.ts` (7) | ✅ pass | スキーマ定義、drizzle 0.45 で不変 |
| 2 | `src/shared/db/access.test.ts` (12) | ✅ pass | [SEC-005] 認可 `withUserScope`/`assertOwner` |
| 3 | `src/shared/db/errors.test.ts` (9) | ✅ pass | DB エラー分類 |
| 4 | 他 33 スイート (capture/notebook/billing/export/memory/account/legal/_shared 各種) | ✅ pass | drizzle 基盤に間接依存、波及なし |
| — | **合計 36 ファイル** | ✅ **373/373 pass** | アップグレード後も 100% green |

## 追加テストケース

追加テストケースなし (依存アップグレードのため振る舞い不変。回帰は既存 373 件で担保)。

## 型・セキュリティ検証 (TDD 補完)

| 検証 | コマンド | 結果 |
|---|---|---|
| 型互換性 | `npx tsc --noEmit` | 0 errors (drizzle API 完全互換) |
| 脆弱性解消 | `npm audit` | high 1→0、GHSA-gpj5-g38j-94v9 = 0 件 |
| migration 生成 | `drizzle-kit generate` (temp 検証) | 10 tables + 5 enums + 7 indexes 生成成功 |

## サマリー

| 項目 | 値 |
|------|-----|
| 計画テスト数 | 0 件 (新規)、回帰 373 件 |
| 追加テスト数 | 0 件 |
| 合計 | 373 件 (既存スイート) |
| 成功 | 373 件 |
| 失敗 | 0 件 |
| 成功率 | 100% |
| カバレッジ | 既存維持 (新規ロジックなし) |

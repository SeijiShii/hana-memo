# 単体テストレポート: _shared/db

## 実施日時
2026-05-23 11:00 (JST)

## 関連ドキュメント
- [003_db_UNIT_TEST.md](./003_db_UNIT_TEST.md) — 単体テスト項目 (計画)
- [101_db_IMPL_REPORT.md](./101_db_IMPL_REPORT.md) — 実装レポート

## テスト実行環境
- Node.js: v22.11.0
- Vitest: 2.1.9
- @vitest/coverage-v8: 2.1.8
- 環境変数: `DATABASE_URL=postgresql://dummy:dummy@localhost:5432/dummy` (実 DB 接続不要、Drizzle metadata のみ検証)

## テスト結果

| # | テストケース | テストファイル | 結果 | 備考 |
|---|---|---|---|---|
| UT-DB-ACC-01 | withUserScope: userId を scope に閉じ込める | access.test.ts | ✅ pass | |
| UT-DB-ACC-02 | withUserScope: 内部関数の戻り値を伝播 | access.test.ts | ✅ pass | |
| UT-DB-ACC-03 | withUserScope: 空文字 userId → TypeError | access.test.ts | ✅ pass | |
| UT-DB-ACC-04 | withUserScope: null/undefined/number → TypeError | access.test.ts | ✅ pass | 3 サブケース |
| UT-DB-ACC-05 | withUserScope: 内部関数の例外を伝播 | access.test.ts | ✅ pass | |
| UT-DB-AUTH-01 | assertOwner: userId 一致 (camelCase) | access.test.ts | ✅ pass | |
| UT-DB-AUTH-02 | assertOwner: user_id 一致 (snake_case) | access.test.ts | ✅ pass | |
| UT-DB-AUTH-03 | **assertOwner: 他人 userId → AuthorizationError** ([SEC-005]) | access.test.ts | ✅ pass | 認可ネガティブテスト |
| UT-DB-AUTH-04 | AuthorizationError: expected/actual フィールド | access.test.ts | ✅ pass | |
| UT-DB-AUTH-05 | assertOwner: snake_case 他人 user_id → throw | access.test.ts | ✅ pass | |
| UT-DB-AUTH-06 | AuthorizationError: name/message | access.test.ts | ✅ pass | |
| UT-DB-AUTH-07 | AuthorizationError: instanceof Error | access.test.ts | ✅ pass | |
| UT-DB-ERR-01 | DbError: message が `[code] msg` 形式 | errors.test.ts | ✅ pass | |
| UT-DB-ERR-02 | DbError: cause を保持 | errors.test.ts | ✅ pass | |
| UT-DB-ERR-03 | isUniqueViolation: code=23505 → true | errors.test.ts | ✅ pass | |
| UT-DB-ERR-04 | isUniqueViolation: 他コードで false | errors.test.ts | ✅ pass | 2 サブケース |
| UT-DB-ERR-05 | isUniqueViolation: 非オブジェクト入力 | errors.test.ts | ✅ pass | 4 サブケース (null/undefined/string/number) |
| UT-DB-ERR-06 | isUniqueViolation: code 不在 → false | errors.test.ts | ✅ pass | |
| UT-DB-ERR-07 | isCheckViolation: code=23514 → true | errors.test.ts | ✅ pass | |
| UT-DB-ERR-08 | isCheckViolation: 23505 → false | errors.test.ts | ✅ pass | |
| UT-DB-ERR-09 | isCheckViolation: 非オブジェクト → false | errors.test.ts | ✅ pass | |
| UT-DB-SCH-01 | schema: 全 10 テーブルが export | schema.test.ts | ✅ pass | |
| UT-DB-SCH-02 | schema: schema object に 10 件 | schema.test.ts | ✅ pass | |
| UT-DB-SCH-03 | users: 主要カラム存在 | schema.test.ts | ✅ pass | |
| UT-DB-SCH-04 | discoveries: 主要カラム存在 | schema.test.ts | ✅ pass | |
| UT-DB-SCH-05 | **webhook_dedupe: 存在確認** ([SEC-006]) | schema.test.ts | ✅ pass | |
| UT-DB-SCH-06 | apiUsage: token + image counter 存在 | schema.test.ts | ✅ pass | |
| UT-DB-SCH-07 | userSettings: location_precision + analytics_opt_in | schema.test.ts | ✅ pass | |

## 追加テストケース

| # | 対象 | テストケース | 追加理由 |
|---|---|---|---|
| UT-DB-AUTH-* | assertOwner | snake_case mismatch (UT-DB-AUTH-05) | 既存 SPEC で `{ user_id }` シグネチャ受領も明記、両形式テストが必要 |
| UT-DB-SCH-05 | webhookDedupe | 存在 + カラム確認 | revise sec_001-003 設計反映の確認 ([SEC-006]) |

(003_db_UNIT_TEST.md の計画は revise 前の仕様、本実装で webhook_dedupe 関連 1 件追加)

## サマリー

| 項目 | 値 |
|---|---|
| 計画テスト数 | ~26 件 (003_db_UNIT_TEST.md 由来) |
| 追加テスト数 | 2 件 (snake_case 認可 + webhook_dedupe) |
| 合計 | **28 件** |
| 成功 | 28 件 |
| 失敗 | 0 件 |
| 成功率 | **100%** |
| 実行時間 | 448ms (transform 132ms + collect 293ms + tests 18ms) |

## カバレッジ

実 DB 接続を伴うテストは含まないため、`access.ts` / `errors.ts` / `schema.ts` (メタデータ) の純粋関数カバレッジは推定 95%+ (まだ実測 `npm run test:coverage` は未実施)。`client.ts` (Drizzle クライアントシングルトン) は実 DB 接続が必要なため後続テスト (E2E or integration) で確認。

## 既知の未対応 (後続セッションで対応)

1. **DB 接続 integration test**: Neon dev branch を立てて `db.select()` 等の実クエリを CI で実行する仕組み → Phase 3.5 (CI 環境構築) で対応
2. **append-only trigger E2E**: SQL migration 0002 の trigger が実際に拒否するかは PostgreSQL 起動環境必要 → manual smoke test in dev branch
3. **CHECK 制約**: `ai_credits_remaining < 0` 等を DB に投入して reject 確認 → 同上

## 更新履歴

| 日付 | 変更概要 | 実行者 |
|---|---|---|
| 2026-05-23 | 初版作成 (28/28 pass) | /flow:tdd |

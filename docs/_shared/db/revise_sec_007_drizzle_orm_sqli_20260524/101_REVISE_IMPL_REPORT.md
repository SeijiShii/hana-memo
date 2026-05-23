# 実装レポート: _shared/db revise sec_007_drizzle_orm_sqli

## 実装日時
2026-05-24 06:03 (JST)

## モード
revise (security-fix / dependency-upgrade)

## 関連ドキュメント
- [001_REVISE_SPEC.md](./001_REVISE_SPEC.md) — 変更仕様書
- [002_REVISE_PLAN.md](./002_REVISE_PLAN.md) — 変更計画書
- [003_REVISE_UNIT_TEST.md](./003_REVISE_UNIT_TEST.md) — 単体テスト計画
- [AI_LOG セッション](../../AI_LOG/D20260524_045_tdd__shared_db_revise_sec_007.md) — 実装判断ログ
- [L4 レポート](../../SECURITY_DEPS_20260524.md#sec-007)

## 注意事項
本レポートのファイルパス・バージョンは実装日時時点のもの。

## 変更一覧

### Phase 1: 依存アップグレード + 互換性確認 (軽・メイン)
- `package.json`: `drizzle-orm` `^0.36.4`→`^0.45.2`、`drizzle-kit` `^0.30.1`→`^0.31.10`
- `package-lock.json`: `npm install` で再生成 (drizzle-orm 0.36.4→0.45.2、drizzle-kit 0.30.6→0.31.10、7 パッケージ削除 / 4 変更)
- **ソースコード変更ゼロ**: `schema.ts` / `client.ts` / `access.ts` は不変。`npx tsc --noEmit` = 0 errors (使用 drizzle API は 0.36→0.45 で完全互換)
- `npm test`: **373/373 pass** 維持

### Phase 2: migration 再生成 + DDL 等価検証 (軽・メイン)
- `drizzle-kit@0.31.10` で `generate` を temp dir 検証実行 (DATABASE_URL ダミー、out=/tmp、リポジトリ非汚染)
- 生成 DDL: **10 tables + 5 CREATE TYPE (enum) + 7 CREATE INDEX + FK** — 設計の 10 テーブル全網羅、スキーマ regression なし
- リポジトリの deploy-time migration (`0000_initial_schema.sql`) 生成は原 db TDD の設計どおり deploy 時に委譲 (DATABASE_URL 必須)。既存カスタム migration (0001 matview / 0002 triggers) は drizzle-kit 非生成のため不変

### Phase 3: セキュリティ検証 (軽・メイン)
- `npm audit`: high **1→0** (drizzle-orm が audit から消失 = 解消)
- GHSA-gpj5-g38j-94v9: 検出 **0 件** (解消確認)

## 実装計画からの差分

| 項目 | 内容 |
|------|------|
| 計画にない追加変更 | なし |
| 計画から省略した変更 | ソース修正 (型エラー発生時のみ予定 → 0 errors で不要)、deploy-time base migration 生成 (原設計どおり deploy 時委譲) |
| 想定外の問題と対処 | drizzle-kit 0.31.10 でも transitive `@esbuild-kit`/`esbuild` (dev only) moderate は残存。これは drizzle-kit 側の既知 dev 依存で prod 非影響、Phase 3.5 bootstrap で frontend stack 一括 upgrade 時に再評価 (本改修の目的=High SQLi 解消は達成) |

## 残存 moderate (9 件、すべて dev-tooling、prod 非影響)
`drizzle-kit` / `@esbuild-kit/{core-utils,esm-loader}` / `esbuild` / `vite` / `vite-node` / `vitest` / `@vitest/{coverage-v8,mocker}` — Phase 3.5 app bootstrap で frontend stack (vite/vitest) 実 install + upgrade 時に解消予定。SCENARIO §4 + SECURITY_DEPS_20260524.md §3 参照。

## PR Description

### タイトル
_shared/db: drizzle-orm 0.45.2 アップグレード (SQLi GHSA-gpj5-g38j-94v9 修正)

### 概要
`/flow:secure --phase=deps` で検出した drizzle-orm `<0.45.2` の SQL injection 脆弱性 (CVSS 7.5) を、drizzle-orm `^0.45.2` + drizzle-kit `^0.31.10` への協調アップグレードで解消。ソースコード変更ゼロ、全テスト green 維持。

### 変更内容
- `drizzle-orm` 0.36.4 → 0.45.2 (SQLi 修正)
- `drizzle-kit` 0.30.6 → 0.31.10 (協調)
- `package.json` / `package-lock.json` のみ変更 (ソース不変)

### テスト
- `npx tsc --noEmit`: 0 errors
- `npm test`: 373/373 pass (100%)
- `npm audit`: high 0、GHSA-gpj5-g38j-94v9 解消
- drizzle-kit 0.31.10 DDL 生成検証: 10 tables + 5 enums + 7 indexes

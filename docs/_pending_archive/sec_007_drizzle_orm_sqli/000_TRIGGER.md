# SEC Seed: GHSA-gpj5-g38j-94v9 / drizzle-orm

**生成元**: /flow:secure (--phase=deps、L4 依存スキャン)
**生成日時**: 2026-05-24
**route**: dispatched-to-revise
**target command**: /flow:revise
**§8 論点**: [論点-015] (SEC-007)

## 概要
- 脆弱性 ID: GHSA-gpj5-g38j-94v9
- パッケージ: `drizzle-orm` (現宣言 `^0.36.4`、prod 直接依存、ORM コア)
- CVSS: 7.5 (CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:N/A:N), severity=**High**, CWE-89 (SQL Injection)
- 脆弱性概要: improperly escaped SQL identifiers 経由の SQL インジェクション。識別子 (テーブル名 / カラム名) が適切にエスケープされず、動的識別子をユーザー入力から組み立てる経路で注入リスク
- 修正バージョン: `>= 0.45.2`
- 影響範囲: **直接依存** (prod)。`src/shared/db/{schema,access}.ts`、`withUserScope`、全 Drizzle クエリ + drizzle-kit migration 生成が依存

## なぜ fix でなく revise か
- npm `isSemVerMajor=true`。`0.36 → 0.45` は drizzle-orm 0.x の 9 マイナーを跨ぐ (0.x はマイナーが破壊的変更を含む慣行)。query builder / 型推論 / relational query API に破壊的変更が入っている可能性
- `withUserScope` (認可ヘルパ、SEC-005 由来) と schema 定義が drizzle API に密結合 → バージョン跨ぎで API/型互換性の検証が必須
- `drizzle-kit` (^0.30.1) も協調アップグレードが必要 (migration 生成互換 + 下記 moderate 解消)。マイグレーション再生成 + apply の確認を伴う

## 推奨対応
1. `drizzle-orm` を `^0.45.2` 以上へ更新 (SQL injection 修正)
2. `drizzle-kit` を協調アップグレード (transitive esbuild/@esbuild-kit moderate も同時解消、下記)
3. `src/shared/db/{schema,access}.ts` の API/型互換性を確認 (型エラー解消)
4. `npm run db:generate` でマイグレーション再生成 → diff レビュー → dev branch で `db:migrate` 検証
5. 全 Vitest スイート green 確認 (現 373/373 を維持)
6. コマンド例: `npm install drizzle-orm@^0.45.2 drizzle-kit@latest`

## 同時解消される moderate (drizzle 系 transitive)
- `@esbuild-kit/core-utils` / `@esbuild-kit/esm-loader` / `esbuild` (drizzle-kit 旧依存経由、dev only) — drizzle-kit アップグレードで解消見込み

## 次のアクション
本 seed は `/flow:auto` で検知され、`/flow:revise --resume sec_007_drizzle_orm_sqli` で対応される。
Phase 3.5 app/api bootstrap (frontend stack install) と同時実施でも可 (vite/vitest 系 moderate と一括 upgrade)。

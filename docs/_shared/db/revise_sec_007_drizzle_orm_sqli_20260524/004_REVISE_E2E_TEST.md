# _shared/db E2E / 検証計画（drizzle-orm SQL インジェクション CVE 対応）

> **入力**: `./001_REVISE_SPEC.md`, `../../concept.md` §1.1, 既存 `_shared/db` には UI なし (基盤層)
> **最終更新**: 2026-05-24

---

## 1. 変更 UC シナリオ

`_shared/db` は基盤層で直接の UC / E2E 画面を持たない。本改修の検証は **ビルド/テスト/監査レベル** で行う。

| シナリオ ID | 前提 | 操作ステップ | 期待結果 |
|---|---|---|---|
| V-01 | upgrade 適用後 | `npm test` | 全 Vitest 373/373 green |
| V-02 | upgrade 適用後 | `npx tsc --noEmit` | 型エラー 0 |
| V-03 | upgrade 適用後 | `npm audit` | GHSA-gpj5-g38j-94v9 (high) が消失、high 0 件 |
| V-04 | upgrade 適用後 | `npm run db:generate` | migration SQL 再生成、既存 DDL と意味的に等価 |
| V-05 (任意) | Neon dev branch | `npm run db:migrate` | 再生成 migration が適用成功 |

## 2. リグレッションシナリオ（既存 UC、重要度高）

> 全 feature が `_shared/db` を基盤に持つため、各 feature のコアテストが drizzle upgrade 後も green であることが最大のリグレッション観点。

| UC | シナリオ ID | 確認観点 |
|---|---|---|
| capture/notebook/billing/export/memory/account/legal のコア | R-01 | 各 feature の `*.test.ts` が upgrade 後も green (DB 経由ロジック不変) |
| 認可 [SEC-005] | R-02 | `access.test.ts` の `withUserScope` / `assertOwner` ネガティブテスト維持 |
| webhook idempotency [SEC-006] | R-03 | `webhook_dedupe` UNIQUE 制約関連テスト維持 |

## 3. 移行検証シナリオ（マイグレーションある時）

| シナリオ ID | 移行前データ | 移行後期待状態 |
|---|---|---|
| M-01 | (データ移行なし) | DDL 再生成が既存スキーマと等価 (新規テーブル/カラム差分なし) |

## 4. 環境要件差分

| 項目 | 前回 | 今回 | 理由 |
|---|---|---|---|
| drizzle-orm | ^0.36.4 | ^0.45.2 | CVE 修正 |
| drizzle-kit | ^0.30.1 | 最新安定 | 協調アップグレード + transitive moderate 解消 |
| Node | 20 | 変更なし | — |

## 5. 期待 KPI

| 指標 | 目標 |
|---|---|
| Vitest pass | 373/373 (100%) |
| npm audit high | 0 件 |
| 型エラー | 0 |

## 6. 更新履歴
| 日付 | 変更概要 | 実行者 |
|---|---|---|
| 2026-05-24 | 初版作成 | /flow:revise (D20260524_044) |

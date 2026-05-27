# billing マイグレーション計画 (pdf_unlocked 列 drop)

> **入力**: `./001_REVISE_SPEC.md`, `./002_REVISE_PLAN.md`
> **最終更新**: 2026-05-26

---

## 1. 移行対象

| 対象 | 種別 | 変更内容 |
|---|---|---|
| `users.pdf_unlocked` | DB (列) | DROP COLUMN |
| `billing_type` enum (`pdf_unlock` 値) | DB (型) | **変更しない** (dead-deprecated で残置) |
| `billing_unlocks` 既存 `type='pdf_unlock'` 行 | DB (データ) | **残置** (歴史行、append-only 台帳) |

> Postgres の enum 値削除 (`ALTER TYPE ... DROP VALUE`) は非対応で、型再作成 + 依存列の付け替えが必要となりリスクが高い。pre-launch で実害が無いため `pdf_unlock` 値は使わないまま残す (D20260526-009)。

## 2. 移行手順

### Step 1: スキーマ編集 + migration 生成
- 内容: `src/shared/db/schema.ts` から `pdfUnlocked` 行を削除 → `npm run db:generate`
- 生成物: `drizzle/migrations/0003_drop_pdf_unlocked.sql` (想定: `ALTER TABLE "users" DROP COLUMN "pdf_unlocked";`)
- 検証: 生成 SQL に **enum への ALTER が含まれていないこと**を目視 (含まれたら手で除去し再生成)。

### Step 2: dev branch で apply
- 内容: `.env.local` の dev branch URL で `npm run db:migrate`
- 検証クエリ:
  - `SELECT column_name FROM information_schema.columns WHERE table_name='users' AND column_name='pdf_unlocked';` → 0 行
  - `SELECT count(*) FROM users;` → apply 前後で件数一致
  - `SELECT ai_credits_remaining FROM users LIMIT 5;` → 値保持
- 想定所要: < 1 秒 (列 drop のみ)

### Step 3: 本番 apply (リリース時)
- 内容: CD パイプライン (Drizzle migration apply) で本番 DB に適用
- 検証: Step 2 と同じクエリ

## 3. ロールバック手順

| 元 Step | 逆操作 | 検証 |
|---|---|---|
| Step 1/2/3 | `ALTER TABLE "users" ADD COLUMN "pdf_unlocked" boolean NOT NULL DEFAULT false;` (down migration) | 列が復活し default false |
| enum | 操作不要 (`pdf_unlock` 値は残置していたため) | — |

> コード側は `git revert` で `pdfUnlocked` 参照を復活可能。enum 値を残したことでコード/DB 双方のロールバックが容易。

## 4. ダウンタイム

- 要否: **不要** (列 drop はメタデータ操作で高速、`ai_credits_remaining` は無関係)
- 影響範囲: なし (pre-launch)

## 5. 失敗時の対応

| 失敗箇所 | 対応 | 連絡先 |
|---|---|---|
| generate で enum ALTER 混入 | SQL を手修正し DROP COLUMN のみに | — |
| apply 失敗 (列が他依存に使用) | 依存 (view/index) を確認。`api_usage_monthly_matview` 等が pdf_unlocked を参照していないか確認後再実行 | — |

## 6. 事前準備

- バックアップ: dev branch は Neon の copy-on-write で即時複製可。本番は apply 前に Neon point-in-time を確認。
- ステージング検証: 必須 (Step 2)
- 関係者通知: 個人運用のため不要

## 7. 更新履歴
| 日付 | 変更概要 | 実行者 |
|---|---|---|
| 2026-05-26 | 初版作成 | /flow:revise |

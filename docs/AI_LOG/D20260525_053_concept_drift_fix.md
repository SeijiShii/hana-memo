# AI_LOG セッション D20260525_053 — /flow:concept (再実行 / drift 修正)

**実行日時**: 2026-05-25 (+09:00)
**コマンド**: /flow:concept (引数なし、冪等再実行)
**対象**: プロジェクト全体 (整合性チェック → BaaS Pivot 伝播漏れ修正)
**実行者**: Claude (Opus 4.7) + seiji
**状態**: 完了
**含まれる decision**: D20260525-053 (1 件) + Step 2 全 Q skip (already-answered)
**ファイル**: `D20260525_053_concept_drift_fix.md`

---

## 主要決定サマリ（人間向け要約）

| ID | テーマ | 採用 | type |
|---|---|---|---|
| (skip) | Step 2 ヒアリング全 Q (1-12.13) | concept.md §1-§10 で既回答のため全 skip | skipped |
| D20260525-053 | BaaS Pivot 伝播漏れの drift 修正範囲 | 全て修正 (~13 箇所) | explicit-choice (= 推奨) |

## 状態スキャン結果 (冪等再実行)

- concept.md §1-§11 完全充足 → 未回答 Q ゼロ、欠落セクションなし
- wants.md クリア済 (2026-05-22)、INDEX / DOC_MAP / PREREQUISITES / SCENARIO / AI_LOG (52 セッション) すべて存在
- **整合性チェックで検出**: D20260522-114 (BaaS Pivot: Supabase → Neon+Vercel+Clerk+R2+Drizzle) の伝播漏れ
  - Pivot 時 (§11 2026-05-22) に書き換えたのは §4.1-4.3 / §4.5 / §4.6.2-3 / §5 / §6 / §10.7
  - **取り残し**: §1.2 / §1.3.2 / §1.4 / §2 / §4.6.5 / §4.6.6 / §4.6.7 / §4.7.2 / §4.7.4 / §4.7.5 / §4.7.7 / [論点-001]
  - §4.7.5 撤退手順は §4.6.7 と矛盾 (後者は正しく Neon+Clerk+R2 削除と記載)

## 修正内容 (D20260525-053、全 13 箇所)

| 箇所 | before (stale) | after |
|---|---|---|
| §1.2 認証 | Supabase Anonymous Auth | Clerk Guest Users (β) + linkIdentity |
| §1.3.2 db | Supabase RLS | Drizzle クエリ層認可 (Postgres RLS 補助) |
| §1.3.2 types | Supabase 型生成 | Drizzle スキーマ由来型 |
| §1.3.2 auth | Supabase Auth ラッパ / RLS 連携 | Clerk ラッパ / JWT→ctx.userId |
| §1.3.2 storage | Supabase Storage ラッパ | Cloudflare R2 (S3 互換) ラッパ / Presigned URL |
| §1.4 実装構成 | Q11 Supabase 確定 / `supabase/` CLI 構成 | 実装済み `src/{app,features,shared,components,lib}` + `api/` (Vercel Fn) + `drizzle/migrations` 構成に追随 |
| §2 制約 | Supabase 無料枠 (DB 500MB / Storage 1GB / Auth 50K MAU) | Neon 0.5GB×10 + R2 10GB + Clerk 10K MAU |
| §4.6.5 BEP | 固定費 Supabase Pro $25、BEP 41 人 | Neon Launch $19 (+ Clerk Pro $25 は 10k MAU 超過時)、BEP 32 人で再計算 |
| §4.6.6 日次アラート | Supabase 無料枠 | Neon / R2 / Clerk / Vercel 無料枠 |
| §4.6.7 一時停止基準 | Supabase 無料枠 100% 超過 | Neon / Clerk 無料枠 100% 超過 |
| §4.7.2 採用パターン+構成図 | (A) Vercel + Supabase / 構成図 Supabase (Auth+DB+Storage+Edge Fn) | Vercel + Neon + Clerk + R2 / 構成図 Vercel Fn → Neon/Clerk/R2 |
| §4.7.4 サブドメ | Supabase Edge Function ラッパ | Vercel Functions API ラッパ |
| §4.7.5 撤退手順 #5 | Supabase プロジェクト pause→delete | Neon DB / Clerk App / R2 Bucket 削除 (§4.6.7 と整合) |
| §4.7.7 ロールバック | Supabase PITR (7 日) | Neon PITR / branch restore |
| [論点-001] 問い | Supabase Auth パスキーサポート | Clerk Passkeys サポート |

**保護した正当な Supabase 言及**: 履歴ノート (§3/§4 注記 / §6 / §11) / §4.3 代替候補列 / §7 決定事項ログ (元の選定 + Pivot 記録) / §1.4 「旧 Supabase Edge Fn 相当」説明。

## 依存関係

- D20260525-053 → 依存: [D20260522-114] (BaaS Pivot 本体決定。本セッションはその伝播完遂)

外部依存: D20260522-114 (`D20260522_016_concept_baas_pivot.md`)

## 生成・更新したアーティファクト

- 更新: `docs/concept.md` (§1.2 / §1.3.2 / §1.4 / §2 / §4.6.5-7 / §4.7.2-7 / [論点-001] / §11 更新履歴 / 冒頭最終更新日)
- 新規: `docs/AI_LOG/D20260525_053_concept_drift_fix.md` (本ファイル)
- 更新: `docs/AI_LOG/INDEX.md` (auto-generated 範囲)

## 学習・改善

- 本セッションでのコマンド自己改変なし (drift 修正のみ、新観点なし)
- 観察: 大規模 Pivot (BaaS 切替) 時に「Pivot が触れたセクション」のリストアップ漏れが drift を生む。今回は §4.6.5-7 と §4.7 が漏れていた。将来 `/flow:audit` のカテゴリ #4 (観点反映) で機械検出する候補。

---

## Decisions

```yaml
- id: D20260525-053
  timestamp: 2026-05-25T00:00:00+09:00
  command: /flow:concept
  phase: 既存 PJ 整合性チェック / drift 修正
  question: BaaS Pivot (D20260522-114) 伝播漏れの Supabase 残存 ~13 箇所をどう処理するか?
  options:
    - 全て修正 (recommended)
    - 実質箇所のみ修正 (§4.6.5-7 + §4.7、§1.4 と [論点-001] は据え置き)
    - 報告のみ・編集しない (AI_LOG に finding 記録)
  recommended: 全て修正
  chosen: 全て修正
  chosen_type: explicit-choice
  depends_on: [D20260522-114]
  context: |
    /flow:concept 冪等再実行の整合性チェックで、2026-05-22 BaaS Pivot (Supabase →
    Neon+Vercel+Clerk+R2+Drizzle、D20260522-114) が §1.2 / §1.3.2 / §1.4 / §2 /
    §4.6.5-7 / §4.7 / [論点-001] に伝播していない drift を検出。確定済み決定の伝播完遂
    であり新規設計判断ではない。ユーザーが「全て修正」を選択 (= 推奨と一致)。
    履歴・代替候補・決定ログの Supabase は正当として保護。
```

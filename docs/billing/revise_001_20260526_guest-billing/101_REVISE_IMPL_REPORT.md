# 実装レポート: billing revise_001 (ゲストトークン低価格単発課金 + pdf_unlock 全廃)

## 実装日時
2026-05-26 (JST) / モード: revise

## 関連ドキュメント
- [001_REVISE_SPEC.md](./001_REVISE_SPEC.md) / [002_REVISE_PLAN.md](./002_REVISE_PLAN.md) / [003_REVISE_UNIT_TEST.md](./003_REVISE_UNIT_TEST.md) / [004_REVISE_E2E_TEST.md](./004_REVISE_E2E_TEST.md) / [005_REVISE_MIGRATION.md](./005_REVISE_MIGRATION.md)
- spec-review: [905_SPEC_REVIEW.md](./905_SPEC_REVIEW.md)
- AI_LOG: [../../AI_LOG/D20260526_069_tdd_billing_revise_001.md](../../AI_LOG/D20260526_069_tdd_billing_revise_001.md)

## 変更概要
匿名(ゲスト)ユーザーがログイン無しのまま **¥100 = AI 識別 10 回** の単発課金を行い購入クレジットを消費できるようにした。あわせて (1) 課金時の Google 連携強制を撤廃、(2) AI 識別 quota を「匿名も購入クレジットを使える」へ更新、(3) pricing を ¥100=10回・1回上限 ¥100 に変更、(4) PDF アンロック (pdf_unlock / PWYW) と export 機能を全廃した。連携は「別端末同期 + 月次無料」の任意特典へ格下げ。

## 変更一覧

### Phase 1: quota コア + identify (本丸、commit `332e370`)
- `src/shared/ai/quota.ts`: `effectiveQuota` の匿名分岐を `trial + ai_credits_remaining` に (消費順 trial→credits)。`mustLink` は恒久 false に (リンク強制廃止、可逆性優先で型は残置)。
- `api/identify-plant.ts`: 枯渇時を常に `QuotaExceededError`(402) に一本化。`link_required`(401) 経路を除去。
- `api/identify-plant.test.ts` / `src/shared/ai/quota.test.ts`: 匿名+credits 消費、trial→credits 順、枯渇 402 を検証 (追加/修正)。
- spec-review R3 解決: `trial.ts` / `spam-guard` は identify enforcement 非経路 (spam-check 専用) と確認し Phase1 スコープ外とした (AI_LOG D20260526-021)。

### Phase 2: pricing + checkout + webhook (commit `694cb1f`)
- `api/billing/create-checkout-session.ts`: `requireLinked()` ガード + `isLinked` 引数 + `fetchIsLinked` を撤廃し、匿名(ゲスト)のまま Checkout 発行可に (`link_required`(401) 経路除去)。
- `src/features/billing/pricing.ts`: `AI_CREDITS_PER_UNIT` 20→10、`AI_QTY_MAX` 10→1 (1回上限 ¥100、O46)。
- `src/features/billing/webhook.ts` / `api/billing/stripe-webhook.test.ts`: 付与を `aiCreditsGranted` 経由で自動的に 10× に。
- `src/features/billing/pages/BillingPage.test.tsx` / `pricing.test.ts` / `webhook.test.ts` / `create-checkout-session.test.ts`: 匿名 checkout 200・10×付与・qty1 上限へ更新。

### Phase 3: pdf_unlock/PWYW/export 全廃 + schema (commit `f210fa6`)
- export 機能全削除: `src/features/export/` 配下 (`components/ExportButton`・`ExportDialog`・`csv.ts`・`errors.ts`・`export.ts`・`exportApi.ts`・`filename.ts`・`hooks.ts`・`index.ts`・`validation.ts` + 各 test) を削除。
- `src/features/billing/`: `pages/BillingPage.tsx` から PWYW/PDF UI を削除、`pricing.ts` から PWYW 定数・検証を削除、`webhook.ts` から `pdf_unlock` 分岐削除、`pages/BillingSuccessPage.tsx` / `index.ts` を追従。`components/PwywSelector` も撤去。
- `src/features/notebook/`: `NotebookContainer.tsx` / `pages/NotebookPage.tsx` の休眠 export 参照を除去。
- `src/shared/db/schema.ts`: `users.pdf_unlocked` 列を drop (migration `drizzle/migrations/0003_drop_users_pdf_unlocked.sql` 生成)。`billing_type` enum の `pdf_unlock` 値は履歴行互換で残置 (`ALTER TYPE ... DROP VALUE` を生成しない)。
- `src/shared/types/types.test.ts`: pdf_unlock 型参照を除去。

### Phase 4: mustLink 完全除去 + 購入導線 (commit `6cd68b4`)
- `src/shared/ai/quota.ts`: Phase1 で恒久 false にしていた `mustLink` フィールドを型・実装から完全除去。
- `src/shared/types/api.ts`: `link_required` typed error union メンバを除去 (到達経路ゼロ確認後)。
- `api/billing/status.ts`: レスポンスから `pdfUnlocked` / `mustLink` を削除し `aiCreditsRemaining` のみに。
- `src/features/billing/`: `BillingContainer`・`api.ts`・`hooks.ts`・`index.ts`・`pages/BillingPage.tsx` から `mustLink` / OAuth ゲートを撤去。
- `src/features/capture/`: `QuotaModal.tsx` を「ログインして」から「¥100 で 10 回」購入導線へ。`CaptureContainer` / `CaptureButton` / `CapturePage` の `linkRequired = mustLink` 分岐を購入導線へ flip。

> マイグレーション (`db:migrate`) の実適用は本 bookkeeping の対象外 (dev branch apply 検証は実装フェーズで実施済、本番 apply はリリース時)。

## 実装計画からの差分

| 項目 | 内容 |
|---|---|
| mustLink の段階的除去 | Phase1 で `mustLink` を恒久 false に**残置** (型・status・billing hooks・CaptureContainer の cascade を一度に壊さず 402/購入導線の behavior を即達成)、Phase4 で完全除去。**可逆性優先** (principle 14) のインクリメンタル実装 (AI_LOG D20260526-022)。計画上は Phase1 で全解消の想定だったが安全側に分割。 |
| OAuthRequiredModal 維持 | 002_PLAN §3 では削除候補だったが、`SettingsPage` (UC6 設定からの Google 連携) が同モーダルを利用しているため**残置**。billing からの参照のみ撤去。 |
| 月次収益 CSV (UC5) 維持 | export 機能全廃は **PDF 図鑑エクスポート / 図鑑 CSV** に限定。運用者向け月次収益エクスポート (`api/export-revenue.ts`、concept §4.6.4.1 / UC5) は別物のため維持。 |
| Phase 構成 | 計画の Phase 5 (export 削除 + spam-check 整理) / Phase 6 (docs) のうち、export 削除は Phase 3 に統合して実装。spam-check fingerprint-cap は identify enforcement 非経路 (R3 確認済) のため identify 側への影響なし。docs 追従は本 bookkeeping (101/102 + concept) で実施。 |

## PR Description

### タイトル
billing revise_001: ゲストのまま ¥100=AI10回 単発課金 + pdf_unlock/PWYW/export 全廃

### 概要
匿名(ゲスト)ユーザーがログイン無しのまま少額単発課金 (¥100=AI 識別 10 回) を行い、購入クレジットを trial 超過後に消費できるようにした。これに伴い課金時の Google 連携強制を撤廃し、AI 識別の枯渇導線を「連携要求(401)」から「購入モーダル(402)」へ転換。不要になった PDF アンロック (pdf_unlock / PWYW) と export 機能を全廃し、`users.pdf_unlocked` 列を drop した (enum 値は履歴互換で残置)。

### 変更内容
- **Phase 1**: quota 匿名分岐を trial+credits 化 (消費順 trial→credits)、identify 枯渇を常に 402 化。
- **Phase 2**: `requireLinked` 撤廃でゲスト課金有効化、pricing ¥100=10回・qty 上限 1、webhook 付与 10×。
- **Phase 3**: export 機能全削除、PWYW/PDF UI 撤去、`users.pdf_unlocked` 列 drop (migration 0003、enum 値残置)。
- **Phase 4**: `mustLink` フィールド完全除去、`QuotaModal` を購入導線へ、`BillingPage` の OAuth ゲート撤去。

### テスト
- 全体 **880 tests green**、typecheck clean。
- 詳細は [102_REVISE_UNIT_TEST_REPORT.md](./102_REVISE_UNIT_TEST_REPORT.md)。
- 残 (E2E / 実機): 匿名で購入(Stripe test mode)→credits 消費→識別継続の preview / 実課金正常系は `/flow:e2e` / `/flow:release` に委譲。

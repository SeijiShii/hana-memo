# 単体テストレポート: billing revise_001 (ゲストトークン低価格単発課金 + pdf_unlock 全廃)

## 実施日時
2026-05-26 (JST) / Vitest 2.1.9 + happy-dom

## テスト結果サマリ

| 項目 | 値 |
|---|---|
| 全体 | **880 green** |
| 成功率 | 100% |
| typecheck | clean (0) |
| カバレッジ目標 | 行 80% / 分岐 70% (vitest.config、既存継承) |

> 本改修は機能の**追加 + 縮小 + 削除**が混在するため、テスト総数は追加 (匿名 credits / ゲスト checkout / identify 402) と削除 (pdf_unlock / PWYW / export / OAuth ゲート) が相殺する。最終 880 green / typecheck clean を確認。

## 追加/修正/削除テストの要約 (Phase 別)

### Phase 1: quota コア + identify
- **追加**: `effectiveQuota` 匿名+credits で `remaining>0` / `consume='credits'`、trial→credits 消費順、trial=max-1+credits=0 / trial=0残+credits=1 の境界 (UT-R-Q01〜Q05)。identify 匿名 trial+credits=0 で `QuotaExceededError`(402)・`LinkRequiredError` を投げない (UT-R-ID01)。
- **修正**: quota 匿名テストの `mustLink:true` 期待を削除し credits 加味へ。identify テストの「匿名超過 401 `link_required`」を「402 `quota_exceeded`」へ。
- 結果: quota 11 + identify 11 green、billing/capture/ai 223 green 回帰なし。

### Phase 2: pricing + checkout + webhook
- **追加/修正**: `creditsFor(1)=10` / `amountFor(1)=100`、checkout 匿名発行 (`requireLinked` を呼ばず `{url,sessionId}` 返却、UT-R-CO01)、webhook `ai_credits` 付与 10×qty (UT-R-WH01)、`validateQuantity(2)` で `InvalidAmountError` (qty1 上限)。
- **修正**: status テストを `aiCreditsRemaining` のみ検証へ縮小。`BillingPage` テストの link gating 期待を撤去。webhook テストの 20×→10×。
- 結果: billing+quota+identify 122 green。

### Phase 3: pdf_unlock/PWYW/export 全廃 + schema
- **削除**: pdf_unlock checkout / webhook テスト、PWYW 検証テスト (`validatePwyw` / 100-10000)、`requirePdfUnlocked` テスト、export 機能テスト一式 (`export/*.test.*`: ExportButton/ExportDialog/csv/export/exportApi/hooks)。
- **修正**: schema / types テストから pdf_unlock 型参照を除去、NotebookContainer / NotebookPage テストの休眠 export 参照を除去。
- migration `0003_drop_users_pdf_unlocked.sql` は dev branch apply で列削除 + `ai_credits_remaining` 保持を検証 (本 bookkeeping では再 apply しない)。

### Phase 4: mustLink 完全除去 + 購入導線
- **修正**: quota / status / billing hooks・api テストから `mustLink` フィールド検証を除去。`QuotaModal` テストを「ログインして」期待から「¥100 で 10 回」購入導線へ。`CaptureContainer` / `CaptureButton` テストの `linkRequired` 分岐を購入導線へ。
- **削除**: billing 側 OAuth ゲート (link_required) 関連テスト。

## リグレッション強化
- Webhook 冪等性 (`webhook_dedupe` event.id + `billing_unlocks` session_id UNIQUE) が pdf_unlock 削除後も維持。
- `ai_credits_remaining` 負数禁止 CHECK が消費経路で維持。
- 匿名・リンク済の双方で credits が正しく消費 (リンク済の monthly→credits 順を含む)。

## カバレッジ
- 目標: 行 80% / 分岐 70% (`vitest.config.ts`、既存継承)。
- quota 匿名分岐 (trial/credits 切り替え + 枯渇) の追加ケースで分岐網羅を維持。export 削除分はカバレッジ対象から除外。

## 残 (follow-up)
- E2E (匿名購入(test mode)→credits 消費→継続識別) は `/flow:e2e`、実課金正常系は `/flow:release` 課金チェックに委譲。

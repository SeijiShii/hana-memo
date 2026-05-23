# 実装レポート: _shared/types

## 実装日時
2026-05-23 17:10 (JST)

## モード
feature (横断、対象=`_shared/types`)、連続実装モード継続

## 関連ドキュメント
- [001_types_SPEC.md](./001_types_SPEC.md) — 仕様書 (※ BaaS Pivot 前 Supabase 想定で書かれていた箇所を Drizzle infer に置き換え)
- [102_types_UNIT_TEST_REPORT.md](./102_types_UNIT_TEST_REPORT.md)
- [AI_LOG セッション](../../AI_LOG/D20260523_027_auto_continuous.md) — /flow:auto 経由の dispatch
- 依存: [_shared/db/schema.ts](../../../src/shared/db/schema.ts) (Drizzle InferSelectModel/InferInsertModel ソース)

## 変更一覧

### Phase 1 (軽、メイン直接): 全 7 ファイル一括実装

新規ファイル:
- `src/shared/types/domain.ts` (~50 lines): Drizzle InferSelectModel/InferInsertModel で 10 テーブル分の Select/Insert 型を派生 + enum aliases (DiscoveryStatus / BillingType / LocationPrecision / DocType / EditField / Season) + LocationCoarse
- `src/shared/types/ai.ts` (~30 lines): IdentifyInput / SimilarSpecies / IdentifyResult / PlantCandidate
- `src/shared/types/billing.ts` (~25 lines): BillingSku / CheckoutSessionInput / UnlockResult
- `src/shared/types/analytics.ts` (~20 lines): CostLogEntry / UsageSummary
- `src/shared/types/api.ts` (~40 lines): ApiError 統合型 (rate_limited / validation_error 等 [SEC-001]+[SEC-003] revise 由来) + isRateLimitedError / isValidationError type guards
- `src/shared/types/index.ts` (~5 lines): barrel export
- `src/shared/types/types.test.ts` (~120 lines): 15 ケース sanity test (型 alias / shape / type guards)

## 実装計画からの差分

| 項目 | 内容 |
|---|---|
| 計画にない追加変更 | (1) `api.ts` 新規追加: SPEC §1.2 にはなかったが、revise sec_001-003 で `ApiError` 統合 + `isRateLimitedError`/`isValidationError` type guards を分離した方が他機能で利用しやすいため追加<br>(2) `LocationCoarse` `Season` 型を domain.ts に追加 (concept §3 NFR 由来) |
| 計画から省略した変更 | (1) `supabase.ts` (自動生成): BaaS Pivot で Drizzle に切替済、Supabase 自動生成型は不要<br>(2) `dto.ts`: 各機能 module で個別定義する方針 (SPEC §1.2) のため本セッションでは作らない |
| 想定外の問題と対処 | なし (Drizzle infer から直接派生、型エラーなし) |

## PR Description

### タイトル
_shared/types: Drizzle infer + AI/billing/analytics/api DTO 型

### 概要
hana-memo の TS 共通型を実装。BaaS Pivot で Supabase 自動生成型 → Drizzle InferSelectModel/InferInsertModel に切替。10 テーブル × Select/Insert + 5 enum + AI/billing/analytics/api の DTO + 統一 API エラー型 (rate_limited / validation_error 等) + type guards。

### 変更内容
- domain.ts: 10 テーブル分の Drizzle infer 型 + 5 enum aliases + LocationCoarse + Season
- ai.ts: OpenAI Vision I/O 型 (IdentifyInput / IdentifyResult)
- billing.ts: Stripe / SKU
- analytics.ts: CostLogEntry / UsageSummary
- api.ts: 統一 ApiError ([SEC-001] rate_limited + [SEC-003] validation_error + 既存 quota/link_required 等)
- index.ts: barrel

### テスト
- Vitest 15 ケース全 pass (累計 43/43)
- compile-time type check + minimal runtime check

## 次のステップ
- 累計: 2/14 完了 (_shared/db + _shared/types)
- 次対象: `_shared/helpers` (優先度 1、依存なし、SSRF guard `url.ts` 含む)

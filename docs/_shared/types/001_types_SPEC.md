# _shared/types 仕様書

> **役割**: TypeScript 共通型 (DB 自動生成 + アプリ層 DTO + 列挙体)
> **タグ**: cross-cutting
> **最終更新**: 2026-05-22
> **入力アーティファクト**: `../../concept.md`, `../db/001_db_SPEC.md`

---

## 1. 提供インターフェース

### 1.1 自動生成型 (`src/shared/types/supabase.ts`)
- Supabase CLI が `_shared/db` のスキーマから生成
- `Database` namespace、`public.Tables.<table>.{Row, Insert, Update}`、`public.Enums.<enum>`

### 1.2 手書き DTO (`src/shared/types/`)

| ファイル | 役割 |
|---|---|
| `supabase.ts` | (自動生成、編集不可) |
| `domain.ts` | ドメインモデル alias (`Discovery = Database.public.Tables.discoveries.Row` 等) |
| `dto.ts` | API I/O 型 (フォーム入力 / コマンド / クエリ結果の集約型) |
| `ai.ts` | OpenAI Vision 入出力型 (`IdentifyPlantInput`, `IdentifyPlantOutput`, `PlantCandidate`) |
| `billing.ts` | 課金関連 (`BillingSku`, `CheckoutSessionInput`, `UnlockResult`) |
| `analytics.ts` | 計測イベント (`CostLogEntry`, `UsageSummary`) |
| `index.ts` | barrel export |

### 1.3 主要型サマリ

| 型 | 出典 | 用途 |
|---|---|---|
| `User` | domain.ts | Auth + プロファイル統合 |
| `Discovery` | domain.ts | 発見レコード (UI / API 共通) |
| `Plant` | domain.ts | 植物マスタ |
| `Image` | domain.ts | 画像メタ |
| `PlantCandidate` | ai.ts | AI 同定候補 (1 件) |
| `IdentifyPlantInput/Output` | ai.ts | OpenAI Vision call の I/O |
| `CostLogEntry` | analytics.ts | api_usage の INSERT 用 |
| `BillingSku` | billing.ts (enum) | 課金 SKU 列挙 (`ai_credits_20` 等) |
| `LocationCoarse` | domain.ts | 丸め済み座標 (`{lat, lng, precision_m}`) |

## 2. 入出力
- 入力: Supabase スキーマ (`_shared/db`)
- 出力: TypeScript ファイル (`src/shared/types/*.ts`)

## 3. データモデル
新規定義なし (DB スキーマ起点)。

## 4. バリデーション・エラー
本モジュールは型のみ提供。バリデーションは各機能 module で zod 等を採用 (concept §4.3 未確定、各 module の SPEC で選定)。

## 5. NFR + 既存連携
| 項目 | 目標値 |
|---|---|
| `supabase gen types` 実行時間 | < 5s |
| 型の再エクスポート overhead | 0 (tree-shake で消える) |
| 後方互換性 | DB スキーマ変更時はマイグレーション同時更新 |

連携: 全機能 + 全横断が依存。

## 6. タグ別追加
なし (cross-cutting のみ)。

## 7. スコープ外
- バリデーション実装 (zod スキーマ 等) → 各機能 module
- ランタイムでの型検証 → 各機能 module

## 8. 未決事項
> 現時点で論点なし (2026-05-22)

## 9. 更新履歴
| 日付 | 変更概要 | 実行者 |
|---|---|---|
| 2026-05-22 | 初版作成 | /flow:feature |

# _shared/types 実装計画書

> **入力**: `./001_types_SPEC.md`, `../db/001_db_SPEC.md`
> **最終更新**: 2026-05-22

---

## 1. 実装対象ファイル一覧 (`src/shared/types/`)

| ファイル | 責務 | 依存 | LOC 見積 |
|---|---|---|---|
| `supabase.ts` | (Supabase CLI 自動生成) | DB schema | ~500 (生成) |
| `domain.ts` | DB 型 → ドメインモデル alias | supabase.ts | ~40 |
| `dto.ts` | API I/O 型集約 | domain.ts | ~80 |
| `ai.ts` | AI 同定 I/O 型 | (なし) | ~30 |
| `billing.ts` | 課金 SKU + I/O 型 | supabase.ts | ~40 |
| `analytics.ts` | 計測イベント型 | (なし) | ~30 |
| `index.ts` | barrel export | 全 above | ~10 |

## 2. 実装 Phase 分割

### Phase 1: DB 型生成 + domain alias
- 対象: supabase.ts (CLI) + domain.ts + index.ts
- ゴール: `import { Discovery, Plant } from '@/shared/types'` が動く

### Phase 2: DTO / AI / billing / analytics
- 対象: 残り 4 ファイル
- ゴール: 機能 module から型 import 可能

## 3. 依存関係順序
DB スキーマ確定 → supabase.ts 生成 → domain.ts → 他

## 4. 既存ファイル影響
- `package.json` に `supabase gen types` の npm script 追加
- CI で型生成 → diff チェック (DB 変更を type 更新忘れ防止)

## 5. 横断フォルダ追加・変更
全機能・全横断が import するため、初回は import 文だけ予約 (`// TODO: import { ... } from '@/shared/types'`)。

## 6. リスク・注意点
- **DB 変更忘れ**: マイグレーション後に `supabase gen types` 実行漏れで型 stale 化 → CI でガード
- **手書き型と自動生成型の重複**: domain.ts は alias のみ、再宣言禁止

## 7. DoD
- [ ] supabase.ts 生成成功
- [ ] 全 import 解決
- [ ] tsc strict pass
- [ ] CI で型 stale 化検出

## 8. 更新履歴
| 日付 | 変更概要 | 実行者 |
|---|---|---|
| 2026-05-22 | 初版作成 | /flow:feature |

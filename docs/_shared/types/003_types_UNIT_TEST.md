# _shared/types 単体テスト計画

> **入力**: `./001_types_SPEC.md`, `./002_types_PLAN.md`
> **最終更新**: 2026-05-22

---

## 1. テストケース (型レベル中心)

### 1.1 正常系
| ID | 対象 | 入力 | 期待出力 |
|---|---|---|---|
| UT-TY-001 | tsc compile | 全 ts ファイル | エラーなし |
| UT-TY-002 | Discovery 型整合 | `_shared/db` Row 型と alias 一致 | tsc OK |
| UT-TY-003 | PlantCandidate 構造 | `{plant_id, confidence, name_ja, name_sci}` | コンパイル成功 |
| UT-TY-004 | BillingSku 列挙 | 'ai_credits_20' \| 'pdf_export' \| 'pwyw_tip_100' \| ... | exhaustive switch OK |

### 1.2 異常系
| ID | 対象 | 失敗条件 | 期待振る舞い |
|---|---|---|---|
| UT-TY-101 | 不正 SKU 代入 | `let s: BillingSku = 'invalid'` | tsc error |
| UT-TY-102 | DB スキーマ変更未反映 | supabase.ts 古い + DB 新 | CI で diff 検出 |

### 1.3 境界値
| ID | 対象 | 境界 | 期待振る舞い |
|---|---|---|---|
| UT-TY-201 | PlantCandidate confidence | 0.0 〜 1.0 範囲 | (型は number、範囲チェックは zod スキーマで別途) |

## 2. Mock 方針
本モジュールはランタイム実装を持たない (型のみ)。Mock 不要。

## 3. カバレッジ目標
| 種別 | 目標 | 根拠 |
|---|---|---|
| 型整合 (tsc strict) | 100% | 型エラーゼロが前提 |
| ランタイムカバレッジ | (該当なし) | コードなし |

## 4. テスト実行環境
- `tsc --noEmit --strict` で型チェックのみ
- CI で `supabase gen types --local > expected.ts && diff expected.ts src/shared/types/supabase.ts` (stale 検出)

## 5. 更新履歴
| 日付 | 変更概要 | 実行者 |
|---|---|---|
| 2026-05-22 | 初版作成 | /flow:feature |

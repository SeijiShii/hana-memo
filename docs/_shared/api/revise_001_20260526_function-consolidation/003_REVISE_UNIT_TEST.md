# _shared/api 単体テスト計画 (function 統合)

> **入力**: `./001_REVISE_SPEC.md`, `./002_REVISE_PLAN.md`, 既存 api/**/*.test.ts
> **最終更新**: 2026-05-26

---

## 1. 追加テストケース (router 層 = 新規)

### 1.1 正常系 (`api/_lib/router.ts`)
| ID | 対象 | 入力 | 期待 |
|---|---|---|---|
| RT-01 | segment 抽出 | `/api/storage/upload-url` | `upload-url` ハンドラに dispatch |
| RT-02 | sub-handler dispatch | 既知 segment | 対応 handler の Response をそのまま返す |
| RT-03 | method 透過 | POST/GET | 各 handler が method 判定 (router は素通し) |

### 1.2 異常系
| ID | 対象 | 条件 | 期待 |
|---|---|---|---|
| RT-04 | 未知 segment | `/api/storage/bogus` | 404 `{error:'not_found'}` |
| RT-05 | segment なし | `/api/storage` | 404 or index 応答 (設計通り) |

### 1.3 各グループ catch-all のスモーク
| ID | 対象 | 期待 |
|---|---|---|
| RT-1x | storage/billing/capture/notebook/auth/cron/legal/account/memory の各 catch-all | 既知サブパスが対応 handler に届く (1 ケースずつ) |

## 2. 修正テストケース
| 対象 | 修正前 | 修正後 | 理由 |
|---|---|---|---|
| 既存ハンドラ unit (storage/billing/... の *.test.ts) | `handler` を相対 import して直呼び | **import パスを `_handlers/` 移設先に追従** (テスト内容・アサーションは不変) | ファイル移動に伴う import パスのみ |
| fetch-path 依存テスト (もしあれば) | 旧パス | 新パス (`/api/cron/*`, `/api/auth/clerk-webhook`) | パス変更追従。大半は handler 直呼びで影響なし |
| **`api/_handler-contract.test.ts`** (全 endpoint の fetch 署名を列挙検査、fix_001 由来) | 24 個別ファイルを列挙 | catch-all router + `_handlers/*` を列挙対象に更新。**router は `export default { fetch }` 署名を維持**、sub-handler は関数 export で別途検査 | 統合で対象ファイルが変わるため列挙更新必須。CI ゲート |

## 3. 削除テストケース
- なし (ロジック削除なし、移動のみ)。

## 4. リグレッション強化
- 全グループの既存ハンドラ unit (storage/billing/capture/notebook/auth/legal/account/memory + identify/cron) が **green を維持**することが本リファクタの主リグレッション指標 (挙動不変の証明)。
- 880 unit green (現状) → 統合後も同等 + router テスト分 (+ ~15) green。

## 5. Mock 方針差分
- 変更なし (handler 内の DI/mock は不変、router は素通しのため mock 不要 or 軽量)。

## 6. カバレッジ目標
| 種別 | 目標 | 根拠 |
|---|---|---|
| 行 | 80% | 既存継承 (vitest.config) |
| 分岐 | 70% | 既存継承。router の 404/dispatch 分岐を網羅 |

## 7. 更新履歴
| 日付 | 変更概要 | 実行者 |
|---|---|---|
| 2026-05-26 | 初版作成 | /flow:revise |

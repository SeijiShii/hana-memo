# _shared/api — Vercel Functions 層 (横断)

**領域**: `api/**` の Vercel Function ハンドラに関する横断的な設計・修正の記録。
個別の endpoint 仕様は各 feature フォルダ (`docs/storage`, `docs/billing` 等) と `_shared/*` に属する。本フォルダは **API 層全体に関わる横断事項** (handler 規約・プラットフォーム結合) を扱う。

<!-- AUTO-GENERATED:BEGIN status -->

## バグ修正
| id | slug | 重大度 | 状態 | 実施日 |
|---|---|---|---|---|
| 001 | vercel-handler-signature | critical | 修正済+検証済 | 2026-05-25 |

## 改修
| id | slug | 種別 | 状態 | 実施日 |
|---|---|---|---|---|
| 001 | function-consolidation | リファクタ (deploy可能性) | 設計完了→実装待ち | 2026-05-26 |

<!-- AUTO-GENERATED:END status -->

## handler 規約 (fix_001 由来)
- Vercel Function の default export は **`export default { fetch: handler }`** (fetch Web Standard export) を標準形とする。
- 素の `export default function handler(req: Request)` は **Vercel 非対応** (本番で hang)。`api/_handler-contract.test.ts` が CI で全 endpoint を検査。
- Node `(req, res)` 形 (`api/health.ts`) も対応形だが、新規は fetch 形に統一。

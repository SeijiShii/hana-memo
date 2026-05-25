# リグレッションテスト計画: Vercel handler-signature バグ

> **入力**: `./001_ROOT_CAUSE.md`, `./002_FIX_PLAN.md`
> **最終更新**: 2026-05-25
> **実装**: `api/_handler-contract.test.ts` (実装済 + green)

---

## 1. 再発防止テストケース

### 1.1 直接原因を捉えるテスト (本体)

`api/_handler-contract.test.ts` — `import.meta.glob` で `api/**/*.ts` の全 endpoint (`_lib`/`_`前置/`.test`/`.d.ts` 除外) を runtime import し、各 default export を検証:

| 判定 | 合格条件 |
|---|---|
| Web fetch 形 | `typeof default === 'object' && typeof default.fetch === 'function'` |
| Node 形 (health) | `typeof default === 'function' && default.length >= 2` |
| **不合格 (バグ形)** | 素の関数で arity < 2 (= `export default function handler(req: Request)`) |

- バグ形 (arity 1 の素の default 関数) で **必ず fail**、修正形で pass。
- **検証済**: 一時 broken file (`zzbroken.ts`) を置くと当該 test が「arity 1 ... hangs on Vercel」で fail することを確認 → 修正後に削除して 25 green。

### 1.2 修正後に必ず通るテスト

| ID | 対象 | 期待 |
|---|---|---|
| R-1 | 全 24 endpoint の default export | supported 形であること (24 件 + discovery 1 = 25 test) |
| R-2 | endpoint 件数 | `>= 23` (glob 破損 / ファイル消失の検知) |

## 2. 類似境界条件テスト

| 境界 | カバー |
|---|---|
| 新規 endpoint 追加時に誤形で書く | glob が自動収集するので**新 file も自動的に契約検査対象**になる (将来の再発も捕捉) |
| health の Node 形 | arity>=2 分岐で合格 (誤って fetch 強制しない) |
| `_lib` / `_` 前置 file | isEndpoint で除外 (route 化されないため対象外) |

## 3. 既存テスト維持確認

| 既存テスト | 維持理由 |
|---|---|
| 各 handler の named helper test (例 `upload-url.test.ts` の `parseUploadUrlBody`) | handler 本体・helper 不変のため全 green 維持 (865 → 890) |

## 4. E2E シナリオ追加 (該当時)

実フロー (撮影→識別→保存) の E2E は `/flow:e2e` / `/flow:release` Phase 2 の責務。本 fix のスコープ外 (契約 test で十分捕捉)。ただし実キー headless E2E が将来この層も自然に踏む。

## 5. Mock 方針

不要 — 契約テストは runtime import + export 形の検査のみ (handler 実行・外部 I/O なし)。module load 副作用は `_lib/clerk` の `@clerk/backend` import のみ (純 import、接続なし)。

## 6. カバレッジ目標

- 修正コード (export 行) のカバレッジは「全 endpoint が契約テストで import される」ことで担保 (100% の endpoint をカバー)。

## 7. 更新履歴

| 日付 | 変更 | 実行者 |
|---|---|---|
| 2026-05-25 | 初版 + 実装 (`api/_handler-contract.test.ts`, 25 test green) | /flow:fix |

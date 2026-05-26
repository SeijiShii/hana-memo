# 実装レポート: _shared/api function-consolidation (revise_001)

## 実装日時
2026-05-26 21:17 (JST)

## モード
revise (横断リファクタ、deploy-readiness)

## 関連ドキュメント
- 001_REVISE_SPEC.md / 002_REVISE_PLAN.md / 003_REVISE_UNIT_TEST.md / 004_REVISE_E2E_TEST.md
- AI_LOG: ../../../AI_LOG/D20260526_073_tdd__shared_api_consolidation.md
- deploy blocker 起点: ../../../AI_LOG/D20260526_071_release_hana-memo.md

## 結果サマリ
**api/ の Serverless Function を 24 → 11 に集約し、Vercel Hobby 12-fn 上限をクリア。** 挙動・API URL は不変 (後方互換)。

| 指標 | before | after |
|---|---|---|
| deployable functions | 24 | **11** (≤12) |
| typecheck | clean | clean |
| unit | 880 | **894** green |
| no-key E2E | 11 | 11 green |
| build | OK | OK |

## 変更一覧

### Phase 1: router helper + storage 試作 (commit d4bea83)
- `api/_lib/router.ts` 新規: `createGroupRouter(group, { action: handler })` が `/api/<group>/<action>` の action segment で dispatch、未知 action は 404。`router.test.ts` 5 green。
- `api/storage/[...path].ts` 新規 + `api/storage/_handlers/{upload-url,signed-url,delete,meta}.ts` 移設 (相対 import 深度 +1 修正)。
- `_handler-contract.test.ts`: `_handlers/` を route 列挙から除外 + sub-handler {fetch} 検査追加。
- routes 24→21。

### Phase 2-3: 残グループ + 11 関数達成 (commit 7ce10fc)
- **在 dir catch-all 化**: billing(4) / capture(3) / notebook(2) / auth(2) / legal(1) / account(1) / memory(1) を各 `api/<group>/[...path].ts` + `_handlers/` に集約。
- **root 移設**: `clerk-webhook`→`api/auth/_handlers/` (auth catch-all に統合)、`check-quota`/`refresh-matview`/`export-revenue`→`api/cron/_handlers/` (新 `api/cron/[...path].ts`)。
- **vercel.json**: crons path を `/api/cron/<job>` に更新。
- **_handler-contract.test.ts**: 関数数 ≤12 を恒久ガード化 (perspectives O49)。
- **import 修正の精密化**: ハンドラ移設で相対 import 深度が変化 (`./_lib`→`../_lib` 等、root 移設は +2)。static `from` は一括 sed、dynamic `import('...')` と shared `_lib`/`src` 参照は **typecheck (tsc) が報告した 40 件を起点に quote-anchored sed で精密修正** (group-local `_lib` の誤変換を回避)。

## 実装計画からの差分
| 項目 | 内容 |
|---|---|
| 計画にない追加 | `_handler-contract.test.ts` の上限を「≤12 恒久ガード」に強化 (O49 の regression guard 化、計画では「列挙更新」のみ) |
| 計画から省略 | なし |
| 想定外の問題と対処 | (1) batch sed が dynamic `import('...')` を取りこぼし → tsc 駆動で精密修正。(2) group-local `_lib` (billing/stripe 等) と shared api/_lib の `../_lib/` 曖昧性 → quote-anchored + module 名指定で安全に分離。(3) runtime 検証 (REL-OPS-001 教訓): build/unit 通過後に dev.sh で全 catch-all の dispatch を実 HTTP 確認 (auth/guest=200 等)。 |

## runtime 検証 (dev.sh、実 HTTP)
全 catch-all がハンドラに到達 (404 でない) ことを確認:
`/api/auth/guest`=200 / billing.status・storage.upload-url・capture.attach・notebook.list・legal.consents・account.settings・cron.check-quota=401(auth) / memory.recommend=405(method) / 未知 action=404 / health=200 / identify-plant=401。

## PR Description
### タイトル
api: serverless function を 24→11 に集約 (Vercel Hobby 12-fn 上限対応)

### 概要
Vercel Hobby の 12 Serverless Function 上限でデプロイがブロックされていた (api/ 24 関数)。グループ別 catch-all ルーティングで 11 関数に集約。挙動・API URL は不変。

### テスト
- unit 894 green / typecheck clean / build OK / no-key E2E 11 green
- dev.sh で全 catch-all の runtime dispatch を実 HTTP 確認

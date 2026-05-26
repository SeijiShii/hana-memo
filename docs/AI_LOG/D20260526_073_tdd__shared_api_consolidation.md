# AI_LOG — /flow:tdd _shared/api revise_001 #073 (function-consolidation)

- **実行日時**: 2026-05-26 (+09:00)
- **コマンド**: /flow:tdd (_shared/api revise_001、/flow:auto #068 反復5 から dispatch)
- **対象**: api/ function 統合 (24→11) の実装
- **実行者**: seiji + Claude
- **状態**: 完了 (ユーザー指示で再開し全 Phase 実装。24→11 関数、unit 894 green / typecheck clean / build OK / runtime routing 検証済。commit d4bea83 + 7ce10fc)

## 主要決定サマリ

| id | フェーズ | 決定 |
|---|---|---|
| D20260526-039 | Step3-4 Phase 抽出 | 3 Phase (1: router+storage試作 / 2: 残8グループ+vercel.json / 3: 検証+contract test)。全 重 |
| D20260526-040 | Step5 Phase1 着手前 実装制約調査 | ハンドラ移設 (`_handlers/`) は相対 import 深度を全変える (`./_lib/r2`→`../_lib/r2` 等) → 24 ハンドラ + 各テストの import 書換が必要。本番検証済の billing/stripe-webhook 経路も含む |
| D20260526-041 | 実装タイミング判断 | **本セッションでは実装着手せず中断** (設計は commit 6b7b0fe で ready)。理由: (a) 全 API ハンドラの import 再配線は delicate、(b) build成功≠runtime正 (REL-OPS-001)、実 deploy 再検証は Class-B で統合完了まで不可、(c) 超長セッション末尾の money-path リファクタは fresh 実行が安全 |

## 実装制約メモ (次回 /flow:tdd 再開時の必読)

- ハンドラ署名: `export default { fetch: handler }` (fix_001 統一)。catch-all も同署名。
- **移設時の import 修正**: `api/<group>/<action>.ts` → `api/<group>/_handlers/<action>.ts` で:
  - `../_lib/clerk` → `../../_lib/clerk`、`./_lib/r2` → `../_lib/r2`、`../../src/...` → `../../../src/...`
  - 各 `<action>.test.ts` の handler import パスも追従
- router 案: `api/_lib/router.ts` の `createGroupRouter(group, { action: handler.fetch })` が `/api/<group>/<action>` の `<action>` segment で dispatch、未知は 404。
- Phase1 は storage (money-path 非依存、隔離検証しやすい) で試作 → build + storage unit + `_handler-contract.test.ts` green でパターン確定。
- DoD: 関数数=11、typecheck、全 unit green、no-key E2E (smoke8+billing3) green、RG-03 (実キー課金系 smoke) で statt billing 経路の回帰なし確認。
- 設計 SoT: `docs/_shared/api/revise_001_20260526_function-consolidation/` (SPEC/PLAN/UNIT/E2E)。

## Decisions

```yaml
- id: D20260526-039
  timestamp: 2026-05-26T20:40:00+09:00
  command: /flow:tdd
  phase: Step3-4 Phase 抽出 + 軽重判定
  question: Phase 構成
  chosen: 3 Phase (router+storage / 残グループ+vercel.json / 検証)、全 重
  chosen_type: auto-recommended
  context: REVISE_PLAN §6 準拠。

- id: D20260526-040
  timestamp: 2026-05-26T20:42:00+09:00
  command: /flow:tdd
  phase: Step5 Phase1 着手前調査
  question: ハンドラ移設の実装影響
  chosen: 相対 import 深度変更で 24 ハンドラ + テストの import 書換が必要と判明
  chosen_type: open
  context: api/storage/upload-url.ts を Read。`./_lib/r2` `../_lib/clerk` `../../src/...` 等、移設で全て深度+1。

- id: D20260526-041
  timestamp: 2026-05-26T20:44:00+09:00
  command: /flow:tdd
  phase: 実装タイミング判断
  question: 本セッションで実装着手するか
  options: [Phase1 着手, 設計 ready で中断し fresh 実行]
  recommended: 設計 ready で中断
  chosen: 中断 (設計は commit 済 = ready、実装は fresh セッションで)
  chosen_type: explicit-choice
  context: |
    全 API ハンドラの import 再配線 = delicate。build成功≠runtime正 (REL-OPS-001) で実 deploy 再検証は Class-B (統合完了まで不可)。
    実 keys で end-to-end 検証済の billing/payment 経路を超長セッション末尾でリファクタするのはリスク。設計 ready のため fresh 再開が安全。
    再開: `/flow:tdd _shared/api revise_001` (本セッションが復帰検知される)。
```

## 実装完了ログ (ユーザー指示「何をするか」で再開、本セッション内)

```yaml
- id: D20260526-042
  timestamp: 2026-05-26T21:05:00+09:00
  command: /flow:tdd
  phase: Phase1 storage 試作
  question: catch-all パターンの確証
  chosen: router.ts + storage catch-all + _handlers 移設 → build/storage unit/contract green (commit d4bea83)
  chosen_type: explicit-choice
  context: money-path 非依存の storage で先に確証。routes 24→21。

- id: D20260526-043
  timestamp: 2026-05-26T21:12:00+09:00
  command: /flow:tdd
  phase: Phase2 import 修正
  question: batch sed が dynamic import を取りこぼした件の修正方法
  chosen: tsc が報告した 40 件を起点に quote-anchored sed で精密修正 (group-local _lib 誤変換を回避)
  chosen_type: explicit-choice
  context: |
    batch sed は static `from` のみ修正、dynamic `import('../../src/...)` と shared `../_lib/{clerk,user,ratelimit}` を取りこぼし。
    `../_lib/` は group-local (billing/stripe 等) と shared (api/_lib) で曖昧 → blanket sed 不可。
    typecheck で broken path を列挙 → quote-anchored + module 名指定で安全分離。0 errors 達成。

- id: D20260526-044
  timestamp: 2026-05-26T21:16:00+09:00
  command: /flow:tdd
  phase: Phase3 runtime 検証
  question: build/unit 通過で十分か (REL-OPS-001 教訓)
  chosen: dev.sh で全 catch-all の実 HTTP dispatch を確認 (build≠runtime のため必須)
  chosen_type: explicit-choice
  context: 全 catch-all がハンドラ到達 (auth/guest=200、他 401/405)、未知 action=404、singles OK。11 関数 ≤12。

- id: D20260526-045
  timestamp: 2026-05-26T21:17:00+09:00
  command: /flow:tdd
  phase: Phase3 仕上げ
  question: contract test の count assertion 最終化
  chosen: ≤12 上限を恒久ガード化 (>=9 && <=12) — O49 の regression guard
  chosen_type: auto-recommended
  context: 将来 13 個目追加で test fail → group catch-all 集約を促す。
```

## 次ステップ
- **/flow:release Phase3 再開**: 11 fn ≤ 12 で preview deploy が通る想定。Vercel env 反映 (inline --env) → deploy → 公開 URL スモーク。deploy 時に Clerk webhook URL を `/api/auth/clerk-webhook` に更新。

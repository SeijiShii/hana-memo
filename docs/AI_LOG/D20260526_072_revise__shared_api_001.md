# AI_LOG — /flow:revise _shared/api #072 (function-consolidation)

- **実行日時**: 2026-05-26 (+09:00)
- **コマンド**: /flow:revise (_shared/api、/flow:auto #068 反復4 から dispatch)
- **対象**: _shared/api 横断改修 — serverless function 統合 (Vercel Hobby 12-fn 上限対応)
- **実行者**: seiji + Claude
- **状態**: 完了 (設計: REVISE_SPEC/PLAN/UNIT/E2E 生成。実装は /flow:tdd 待ち)
- **含まれる decision 範囲**: 統合トリガ / ルーティング方針 / グルーピング粒度 / 設計生成

## 主要決定サマリ

| id | フェーズ | 決定 |
|---|---|---|
| D20260526-036 | トリガ | /flow:release Phase3 で 24 fn > Hobby 12 上限 BLOCKED → ユーザー選択で function 統合リファクタ (Pro 課金でなく無料、低コスト ethos) |
| D20260526-037 | ルーティング方針 | グループ別 catch-all (`api/<group>/[...path].ts`)。単一 catch-all より読みやすくドメイン境界維持。フロント URL は同一パス維持 (catch-all が `/api/<group>/*` を受ける)。perspectives O49 推奨 |
| D20260526-038 | グルーピング粒度 | 24→11 (余裕1)。多エンドポイント dir 5 を catch-all 化 + cron 3→1 + clerk-webhook を auth に統合。identify-plant/health/legal/account/memory は単体維持 (ドメイン境界明確) |

## 統合マッピング (24 → 11)

| 新 function | 吸収する既存 | n→1 |
|---|---|---|
| `api/storage/[...path].ts` | upload-url, signed-url, delete, meta | 4→1 |
| `api/billing/[...path].ts` | confirm, create-checkout-session, status, stripe-webhook | 4→1 |
| `api/capture/[...path].ts` | attach, discovery, status | 3→1 |
| `api/notebook/[...path].ts` | edit, list | 2→1 |
| `api/auth/[...path].ts` | guest, spam-check, clerk-webhook (root から移動) | 3→1 |
| `api/cron/[...path].ts` | refresh-matview, check-quota, export-revenue (vercel.json crons 更新) | 3→1 |
| `api/identify-plant.ts` (維持) | — | 1 |
| `api/health.ts` (維持) | — | 1 |
| `api/legal/[...path].ts` | consents | 1 |
| `api/account/[...path].ts` | settings (+ delete) | 1 |
| `api/memory/[...path].ts` | recommend | 1 |
| **合計** | **24** | **11** |

## 後方互換性 / リリース
- **フロント API URL は不変** (catch-all が同一パスを受ける) → 後方互換 ✅、frontend 変更なし。
- ハンドラのドメインロジックは不変 (各 `handler` 関数を catch-all が import して path/method で dispatch)。`export default { fetch }` の Web 標準シグネチャ ([[fix_001 handler-signature]] で統一済) を踏襲。
- vercel.json crons: `/api/refresh-matview` 等 → `/api/cron/refresh-matview` 等にパス更新が必要 (cron 設定の変更)。
- ロールバック: git revert (コードのみ、DB 変更なし)。
- リリース: 統合後に preview deploy 再試行 → 11 fn ≤ 12 で通る想定。

## Decisions

```yaml
- id: D20260526-036
  timestamp: 2026-05-26T20:25:00+09:00
  command: /flow:revise
  phase: Step1 改修トリガ
  question: 統合リファクタの動機・スコープ
  chosen: Vercel Hobby 12-fn 上限で deploy BLOCKED (api/ 24 fn) → 無料の function 統合で対応
  chosen_type: explicit-choice
  depends_on: [D20260526-035]
  context: /flow:release #071 Phase3 の deploy blocker。build は成功 = deploy-ready、関数数のみが問題。

- id: D20260526-037
  timestamp: 2026-05-26T20:26:00+09:00
  command: /flow:revise
  phase: Step3 ルーティング方針
  question: 統合のルーティングパターン
  options: [グループ別 catch-all, 単一 catch-all, vercel.json rewrites]
  recommended: グループ別 catch-all
  chosen: グループ別 catch-all (api/<group>/[...path].ts)
  chosen_type: explicit-choice
  context: ユーザー選択。単一 catch-all は全 API 1 ファイル経由で可読性/cold start トレードオフ。グループ別はドメイン境界維持 + フロント URL 不変。perspectives O49。

- id: D20260526-038
  timestamp: 2026-05-26T20:27:00+09:00
  command: /flow:revise
  phase: Step3 グルーピング粒度
  question: 12 上限に対するマージン
  options: [11 (ドメイン維持), 9-10 (余裕多), revise で調整]
  recommended: 11 (ドメイン維持)
  chosen: 11 関数 (余裕1、ドメイン境界明確)
  chosen_type: explicit-choice
  context: 多エンドポイント dir 5 catch-all + cron 3→1 + clerk-webhook→auth。identify-plant/health/legal/account/memory 単体維持。
```

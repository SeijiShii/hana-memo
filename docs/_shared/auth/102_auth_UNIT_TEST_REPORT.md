# 単体テストレポート: _shared/auth (SDK 非依存コア)

## 実施日時
2026-05-23 17:48 (JST)

## 関連ドキュメント
- [003_auth_UNIT_TEST.md](./003_auth_UNIT_TEST.md) — 単体テスト項目 (計画)

## テスト実行環境
- Node 20 / Vitest 2.1.9 (`environment: node`, v8 coverage)

## テスト結果

| # | テストケース | テストファイル | 結果 |
|---|------------|-------------|------|
| UT-AU-G03〜G05 | checkTrialQuota 匿名 0/3 回 + OAuth Infinity | trial.test.ts | ✅ |
| UT-AU-G06〜G07 | enforceTrialLimit 超過 throw / 範囲内 resolve | trial.test.ts | ✅ |
| (追加) | remaining 下限クランプ / max 上書き / ANON_TRIAL_MAX / quota 添付 | trial.test.ts | ✅ |
| UT-AU-R01〜R02 | assertOwnUser 自分 OK / 他人 throw / id 欠落 | rls.test.ts | ✅ |
| UT-AU-R03 | LinkRequiredError / AuthInitError(cause) / OAuthCallbackError(code) | rls.test.ts | ✅ |
| (新規) | mapClerkWebhookEvent created/updated/deleted/external/ignore | webhook.test.ts | ✅ |
| (新規) | applyUserSync 匿名/非匿名 linkedAt / softDelete / ignore | webhook.test.ts | ✅ |

## 追加テストケース

| # | 対象 | 追加理由 |
|---|------|---------|
| A1 | trial クランプ / max 上書き / quota 添付 | 境界 + LinkRequiredError ペイロード |
| A2 | webhook 全イベント分岐 + applyUserSync 全 op | event→DB-op mapping の網羅 ([SEC-006]) |

## サマリー

| 項目 | 値 |
|------|-----|
| 計画テスト数 (本コア該当) | 約 13 件 (G03〜G07 + R01〜R03 + webhook) |
| 追加テスト数 | 12 件 |
| 合計 | 25 件 |
| 成功 | 25 件 / 失敗 0 件 / 成功率 100% |
| auth 行カバレッジ | 99.06% (目標 90% ↑) |
| auth 分岐カバレッジ | 97.05% (目標 85% ↑) |
| errors/trial/rls/webhook.ts | 行 100% |

## カバレッジ未達・補足
- `index.ts` (barrel) 0%: re-export のみ。
- **defer (本レポート対象外)**: session/link/provider/hooks (React+jsdom+@testing-library/react)、getFingerprint、Vercel handler の svix/clerk-backend 検証。UT-AU-S/L/E/B 系および UT-AU-G01/G02/G08 は app/api bootstrap フェーズで jsdom + SDK mock で実施。

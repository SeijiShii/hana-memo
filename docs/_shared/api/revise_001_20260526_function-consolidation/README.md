# 改修: serverless function 統合 (Vercel 12-fn 上限対応)

- **issue / slug**: revise_001 / function-consolidation
- **実施日**: 2026-05-26
- **対象**: `_shared/api` 横断 (api/ 全体のルーティング構造)
- **改修要望**: /flow:release #071 Phase3 で preview deploy が Vercel Hobby の 12 Serverless Functions 上限に対し **api/ 24 関数**で BLOCKED。ビルド・ローカル課金系 E2E は GREEN で deploy-ready、関数数のみが blocker。ユーザー選択で **Pro 課金でなく function 統合リファクタ (無料)** で対応。
- **方針**: グループ別 catch-all (`api/<group>/[...path].ts`) で **24 → 11 関数**。フロント API URL は同一パス維持 (後方互換)。perspectives O49 / memory `hana-memo-deploy-blocked-fn-consolidation`。
- **状態**: 設計完了 (実装は /flow:tdd 待ち)

## ドキュメント
- `001_REVISE_SPEC.md` — 変更仕様 (before/after、統合マッピング、後方互換、ロールバック)
- `002_REVISE_PLAN.md` — 変更計画 (新規 catch-all / 削除 / vercel.json / Phase 分割)
- `003_REVISE_UNIT_TEST.md` — 単体テスト計画 (ルーティング層 + 既存ハンドラテスト維持)
- `004_REVISE_E2E_TEST.md` — E2E/検証計画 (既存 smoke+billing 維持 + 関数数 ≤12 検証 + deploy 再試行)

## 関連
- deploy blocker: `../../../AI_LOG/D20260526_071_release_hana-memo.md`
- 設計 AI_LOG: `../../../AI_LOG/D20260526_072_revise__shared_api_001.md`
- ハンドラ署名統一: `../fix_001_20260525_vercel-handler-signature/`
- perspectives O49 (serverless 関数上限)

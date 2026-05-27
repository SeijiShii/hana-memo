# 改修: ゲストトークン低価格単発課金 (ログイン不要) + PDF/pdf_unlock 全廃

- **issue / slug**: revise_001 / guest-billing
- **実施日**: 2026-05-26
- **対象機能**: ../README.md
- **基準 SPEC**: ../001_billing_SPEC.md
- **改修要望**: 匿名(ゲスト)のまま ¥100=AI10回 の単発課金を可能にする。ログイン強制を撤廃し、デバイス間同期したい人だけ任意で Google 連携。PDF エクスポート(pdf_unlock)は不要なので全廃。
- **適用観点**: O46 (ゲスト低価格単発課金) / O47 (無料枠の濫用耐性)
- **状態**: 設計完了

## このフォルダのドキュメント

- `001_REVISE_SPEC.md` — 変更仕様書 (変更前 vs 変更後)
- `002_REVISE_PLAN.md` — 変更計画書 (変更 / 新規 / 削除ファイル + Phase 分割)
- `003_REVISE_UNIT_TEST.md` — 単体テスト計画 (追加 / 修正 / 削除)
- `004_REVISE_E2E_TEST.md` — E2E + リグレッション計画
- `005_REVISE_MIGRATION.md` — マイグレーション計画 (pdfUnlocked 列 drop)

## 要点

- **本丸**: `src/shared/ai/quota.ts` で匿名ユーザーが `ai_credits_remaining` を消費可能に。`mustLink` 廃止。trial+credits 枯渇は `quota_exceeded`(購入導線)。
- **付随**: `requireLinked` 撤廃 / pricing ¥100=10回・上限¥100・PWYW削除 / pdf_unlock 全廃 (schema 列 drop + export 機能削除) / 文言を購入導線へ。
- **据え置き**: 無料枠構造 (匿名3生涯 / リンク済10月次)、IP=rate-limit鍵のみ、guest 発行、レート制限、billing_unlocks 台帳、冪等性。

## 関連

- 高度モデルレビュー: `/dev-review` 推奨 (非互換 migration あり)
- AI_LOG: ../../AI_LOG/D20260526_065_revise_billing_001.md

-- =============================================================================
-- 0003_drop_users_pdf_unlocked.sql
-- 関連: docs/billing/revise_001 (PDF アンロック / PWYW / PDF エクスポート機能の撤去)
-- 説明: users.pdf_unlocked カラムを削除する。課金は ai_credits のみに集約。
--       billing_type enum の 'pdf_unlock' 値は履歴行互換のため残す (DROP VALUE しない)。
-- =============================================================================

ALTER TABLE "users" DROP COLUMN "pdf_unlocked";

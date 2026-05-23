-- =============================================================================
-- 0002_append_only_triggers.sql
-- 関連: docs/_shared/db/001_db_SPEC.md §3.6 §3.8 §3.9 (append-only)
--      docs/SECURITY_REVIEW_20260523.md (改ざん防止)
-- 説明: billing_unlocks / consent_logs / discovery_edits の UPDATE/DELETE を禁止。
--       例外: discoveries は soft-delete (deleted_at) のため UPDATE 許可。
-- =============================================================================

-- billing_unlocks: 課金履歴は変更不可
CREATE OR REPLACE FUNCTION assert_append_only_billing_unlocks()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'billing_unlocks is append-only: % operation rejected', TG_OP
    USING ERRCODE = 'feature_not_supported';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS billing_unlocks_no_update ON billing_unlocks;
DROP TRIGGER IF EXISTS billing_unlocks_no_delete ON billing_unlocks;

CREATE TRIGGER billing_unlocks_no_update
  BEFORE UPDATE ON billing_unlocks
  FOR EACH ROW EXECUTE FUNCTION assert_append_only_billing_unlocks();

CREATE TRIGGER billing_unlocks_no_delete
  BEFORE DELETE ON billing_unlocks
  FOR EACH ROW EXECUTE FUNCTION assert_append_only_billing_unlocks();

-- consent_logs: 同意ログは法令対応のため変更不可 (user_id NULL 化は明示的に許可しない、撤退時のみ UPDATE を別途許可することを将来検討)
CREATE OR REPLACE FUNCTION assert_append_only_consent_logs()
RETURNS TRIGGER AS $$
BEGIN
  -- NULL 化 (user_id を NULL に更新する処理) のみ許可、それ以外は拒否
  IF TG_OP = 'UPDATE' AND NEW.user_id IS NULL AND OLD.user_id IS NOT NULL
     AND NEW.doc_type = OLD.doc_type
     AND NEW.doc_version = OLD.doc_version
     AND NEW.agreed_at = OLD.agreed_at
  THEN
    RETURN NEW;
  END IF;
  RAISE EXCEPTION 'consent_logs is append-only (user_id NULL化のみ許容): % operation rejected', TG_OP
    USING ERRCODE = 'feature_not_supported';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS consent_logs_no_update ON consent_logs;
DROP TRIGGER IF EXISTS consent_logs_no_delete ON consent_logs;

CREATE TRIGGER consent_logs_no_update
  BEFORE UPDATE ON consent_logs
  FOR EACH ROW EXECUTE FUNCTION assert_append_only_consent_logs();

CREATE TRIGGER consent_logs_no_delete
  BEFORE DELETE ON consent_logs
  FOR EACH ROW EXECUTE FUNCTION assert_append_only_consent_logs();

-- discovery_edits: 編集履歴は audit-like、append-only
CREATE OR REPLACE FUNCTION assert_append_only_discovery_edits()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'discovery_edits is append-only: % operation rejected', TG_OP
    USING ERRCODE = 'feature_not_supported';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS discovery_edits_no_update ON discovery_edits;
DROP TRIGGER IF EXISTS discovery_edits_no_delete ON discovery_edits;

CREATE TRIGGER discovery_edits_no_update
  BEFORE UPDATE ON discovery_edits
  FOR EACH ROW EXECUTE FUNCTION assert_append_only_discovery_edits();

CREATE TRIGGER discovery_edits_no_delete
  BEFORE DELETE ON discovery_edits
  FOR EACH ROW EXECUTE FUNCTION assert_append_only_discovery_edits();

-- =============================================================================
-- CHECK 制約: users.ai_credits_remaining >= 0, trial_used_count >= 0
-- =============================================================================

ALTER TABLE users
  ADD CONSTRAINT users_ai_credits_remaining_nonneg
    CHECK (ai_credits_remaining >= 0);

ALTER TABLE users
  ADD CONSTRAINT users_trial_used_count_nonneg
    CHECK (trial_used_count >= 0);

ALTER TABLE billing_unlocks
  ADD CONSTRAINT billing_unlocks_amount_jpy_positive
    CHECK (amount_jpy > 0);

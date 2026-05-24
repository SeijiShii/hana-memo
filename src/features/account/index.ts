// account feature barrel (UI 非依存コア)
// 関連: docs/account/001_account_SPEC.md
// React sections/modals/hooks + Sentry reconfigure + RPC/purge glue は app bootstrap フェーズで追加
export { AccountError, AlreadyDeletedError, NotPendingDeletionError } from './errors';
export {
  LOCATION_PRECISIONS,
  validateLocationPrecision,
  deriveAiConsentChange,
  isAiConsentActive,
  type LocationPrecision,
  type AiConsentChange,
} from './settings';
export {
  DELETION_GRACE_DAYS,
  MAX_DELETION_REASON,
  sanitizeDeletionReason,
  isPurgeEligible,
  requestAccountDeletion,
  cancelAccountDeletion,
  type AccountDeletionStore,
} from './deletion';
// presentation glue (React sections/modals) — app bootstrap で onUpdateSettings / onDeleteAccount を配線。
export {
  DeleteAccountDialog,
  type DeleteAccountDialogProps,
} from './components/DeleteAccountDialog';
export {
  SettingsPage,
  type SettingsPageProps,
  type SettingsView,
  type SettingsPatch,
} from './pages/SettingsPage';

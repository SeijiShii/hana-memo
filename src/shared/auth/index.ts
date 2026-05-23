// _shared/auth barrel (SDK 非依存コア)
// 関連: docs/_shared/auth/001_auth_SPEC.md
// React/Clerk/Vercel glue (provider/hooks/link/api handler) は app/api bootstrap フェーズで追加
export { LinkRequiredError, AuthInitError, OAuthCallbackError } from './errors';
export {
  ANON_TRIAL_MAX,
  checkTrialQuota,
  enforceTrialLimit,
  type TrialQuota,
} from './trial';
export { assertOwnUser } from './rls';
export {
  mapClerkWebhookEvent,
  applyUserSync,
  type ClerkWebhookEvent,
  type UserSyncOp,
  type UserSyncStore,
} from './webhook';

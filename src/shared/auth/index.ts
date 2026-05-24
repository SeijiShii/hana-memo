// _shared/auth barrel — SDK 非依存コア + isomorphic glue ロジック。
// 関連: docs/_shared/auth/001_auth_SPEC.md
// React 専用 (Clerk hooks/context) の provider.tsx / hooks.ts は React を import するため
// barrel には含めず、コンポーネント側が直接 import する (`@shared/auth/provider` 等)。
// Vercel Function (api/) も barrel 経由でなく webhook/trial コアを直接消費する。
export { LinkRequiredError, AuthInitError, OAuthCallbackError } from './errors';
export { ANON_TRIAL_MAX, checkTrialQuota, enforceTrialLimit, type TrialQuota } from './trial';
export { assertOwnUser } from './rls';
export {
  mapClerkWebhookEvent,
  applyUserSync,
  type ClerkWebhookEvent,
  type UserSyncOp,
  type UserSyncStore,
} from './webhook';
export { ensureGuestSession, type GuestSignInFn } from './guest-session';
export {
  getIdentities,
  isLinked,
  linkWithGoogle,
  assertValidCallbackUrl,
  assertStateMatches,
  type Identity,
  type ExternalAccountLike,
  type LinkableUser,
} from './link';
export {
  getFingerprint,
  enforceTrialLimitRemote,
  type GetFingerprintDeps,
  type SpamCheckResponse,
} from './spam-guard';

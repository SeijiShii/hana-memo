// legal feature barrel (UI 非依存コア)
// 関連: docs/legal/001_legal_SPEC.md
// React component (InitialConsent/ReConsent/LegalPage) / hook / Markdown render は app bootstrap フェーズで追加
export { ConsentError } from './errors';
export {
  LATEST_VERSIONS,
  parseSemver,
  compareVersion,
  needsReConsent,
  type ReConsentResult,
} from './versions';
export {
  validateConsentInput,
  buildConsentRecords,
  deriveLatestConsents,
  recordConsents,
  type ConsentRecord,
  type ConsentStore,
} from './consent';

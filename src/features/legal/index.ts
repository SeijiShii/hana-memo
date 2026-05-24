// legal feature barrel (UI 非依存コア + presentation glue)
// 関連: docs/legal/001_legal_SPEC.md
// コア (consent/versions/errors) に加え、同意 UI (ConsentGate/ConsentCheckbox) と
// 静的文書ページ (LegalPage) を app bootstrap フェーズで配線するため再輸出する。
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
export {
  LEGAL_DOC_META,
  LEGAL_DOC_BODY,
  SCTA_META,
  type LegalDocType,
  type LegalDocPath,
  type LegalDocMeta,
  type LegalDocBody,
} from './docs';
export { ConsentCheckbox, type ConsentCheckboxProps } from './components/ConsentCheckbox';
export { ConsentGate, type ConsentGateProps } from './components/ConsentGate';
export { LegalPage, type LegalPageProps, type LegalDoc } from './pages/LegalPage';

// capture feature barrel (UI 非依存コア)
// 関連: docs/capture/001_capture_SPEC.md
// React hooks (useImageConvert/useGeolocation/useCaptureFlow/useIdentifyStatus) + camera + Realtime は app bootstrap フェーズで追加
export { CaptureError, AiConsentRequiredError } from './errors';
export { MAX_USER_NOTE, sanitizeUserNote } from './note';
export {
  DISCOVERY_STATUSES,
  isTerminalStatus,
  canRetry,
  nextStatusOnRetry,
} from './status';
export {
  runCapturePipeline,
  type CaptureDeps,
  type CapturePipelineInput,
} from './flow';

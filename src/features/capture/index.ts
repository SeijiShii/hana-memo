// capture feature barrel (コア + app bootstrap glue)
// 関連: docs/capture/001_capture_SPEC.md
// IO は api/capture/ (Vercel Function)、画面は CameraCapture + hooks (Phase 3.5 Milestone B)
export { CaptureError, AiConsentRequiredError } from './errors';
export { MAX_USER_NOTE, sanitizeUserNote } from './note';
export { DISCOVERY_STATUSES, isTerminalStatus, canRetry, nextStatusOnRetry } from './status';
export { runCapturePipeline, type CaptureDeps, type CapturePipelineInput } from './flow';
export {
  createDiscovery,
  attachImage,
  deleteDiscovery,
  fetchDiscoveryStatus,
  type CaptureApiOptions,
  type DiscoveryStatusResult,
} from './captureApi';
export {
  useImageConvert,
  useGeolocation,
  useCaptureFlow,
  useIdentifyStatus,
  type CaptureFlowOptions,
  type IdentifyStatusOptions,
} from './hooks';
export { CameraCapture, type CameraCaptureProps } from './CameraCapture';
export { CaptureButton, type CaptureButtonProps } from './components/CaptureButton';
export { QuotaModal, type QuotaModalProps, type QuotaModalReason } from './components/QuotaModal';
export { CapturePage, type CapturePageProps } from './pages/CapturePage';
export { PreviewPage, type PreviewPageProps } from './pages/PreviewPage';

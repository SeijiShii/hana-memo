/**
 * capture 例外型
 * 関連: docs/capture/001_capture_SPEC.md §4
 */

export class CaptureError extends Error {
  constructor(
    public readonly reason: string,
    public override readonly cause?: unknown,
  ) {
    super(`Capture: ${reason}`);
    this.name = 'CaptureError';
  }
}

/** ai_consent_revoked_at が set の状態で撮影識別を試みた (SPEC §4.1) */
export class AiConsentRequiredError extends CaptureError {
  constructor() {
    super('AI consent is required (revoked)');
    this.name = 'AiConsentRequiredError';
  }
}

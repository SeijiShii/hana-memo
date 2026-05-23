/**
 * 撮影パイプライン orchestration (UI/IO 非依存、依存は DI)
 *
 * SPEC UC1 の同期部 (同意/quota 事前チェック → discovery 作成 → upload → image 紐付け → identify 起動)
 * を純粋なオーケストレーションとして実装。React hook (useCaptureFlow) / Realtime / 実 IO は注入する。
 *
 * 関連: docs/capture/001_capture_SPEC.md §1 UC1, 003_capture_UNIT_TEST.md §1.3 (CF01〜CF03)
 */
import { QuotaExceededError } from '../../shared/ai';
import { UploadFailedError } from '../../shared/storage';
import { AiConsentRequiredError } from './errors';

export type CapturePipelineInput = {
  userId: string;
  capturedAt: string;
  season: string;
  location?: { lat: number; lng: number };
  userNote?: string;
};

/** 撮影パイプラインが必要とする副作用を抽象化 (実体は React hook + DB/Storage/AI を注入)。 */
export type CaptureDeps = {
  /** ai_consent_revoked_at が null か (account.isAiConsentActive 由来) */
  isAiConsentActive: () => boolean;
  /** quota 残あり = true (billing/ai quota 由来) */
  checkQuota: () => Promise<boolean>;
  /** discoveries INSERT (status=identifying) → discoveryId */
  createDiscovery: (input: CapturePipelineInput) => Promise<string>;
  /** R2 upload → objectKey */
  uploadImage: (discoveryId: string) => Promise<{ objectKey: string }>;
  /** images INSERT + discoveries UPDATE (image 紐付け) */
  attachImage: (discoveryId: string, objectKey: string) => Promise<void>;
  /** identify-plant を非同期起動 */
  triggerIdentify: (discoveryId: string) => Promise<void>;
  /** 失敗時の discoveries ロールバック削除 */
  deleteDiscovery: (discoveryId: string) => Promise<void>;
};

/**
 * 撮影 → 識別起動までの同期パイプライン。
 * - 同意 OFF → AiConsentRequiredError (discovery 作成前)
 * - quota 0 → QuotaExceededError (discovery 作成前、UT-CA-CF02)
 * - upload 失敗 → discovery を削除して UploadFailedError (UT-CA-CF03)
 * - 正常 → createDiscovery → upload → attach → triggerIdentify の順 (UT-CA-CF01)
 */
export async function runCapturePipeline(
  deps: CaptureDeps,
  input: CapturePipelineInput,
): Promise<{ discoveryId: string }> {
  if (!deps.isAiConsentActive()) {
    throw new AiConsentRequiredError();
  }
  if (!(await deps.checkQuota())) {
    throw new QuotaExceededError('quota exceeded before capture');
  }

  const discoveryId = await deps.createDiscovery(input);

  let objectKey: string;
  try {
    ({ objectKey } = await deps.uploadImage(discoveryId));
  } catch (err) {
    await deps.deleteDiscovery(discoveryId);
    throw new UploadFailedError('capture upload failed', err);
  }

  await deps.attachImage(discoveryId, objectKey);
  await deps.triggerIdentify(discoveryId);

  return { discoveryId };
}

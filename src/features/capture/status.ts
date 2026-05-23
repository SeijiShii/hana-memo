/**
 * discovery ステータス遷移ロジック (純関数)
 * 関連: docs/capture/001_capture_SPEC.md §3.1/§6.2, 003_capture_UNIT_TEST.md §1.6 (R01/R02)
 */
import { CaptureError } from './errors';
import type { DiscoveryStatus } from '../../shared/types/domain';

export const DISCOVERY_STATUSES: DiscoveryStatus[] = [
  'identifying',
  'identified',
  'pending',
  'unknown',
];

/** terminal ステータス (これ以上遷移しない)。identified / unknown。 */
export function isTerminalStatus(status: DiscoveryStatus): boolean {
  return status === 'identified' || status === 'unknown';
}

/** 再識別可能か (pending のみ、UT-CA-R01/R02)。 */
export function canRetry(status: DiscoveryStatus): boolean {
  return status === 'pending';
}

/** 再識別開始時の次ステータス。pending 以外は CaptureError。 */
export function nextStatusOnRetry(status: DiscoveryStatus): DiscoveryStatus {
  if (!canRetry(status)) {
    throw new CaptureError(`cannot retry from status: ${status}`);
  }
  return 'identifying';
}

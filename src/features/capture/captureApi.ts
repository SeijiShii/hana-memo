/**
 * capture frontend API ラッパ (Vercel Function を叩く純粋関数群)
 *
 * runCapturePipeline (flow.ts) の CaptureDeps に注入する IO 実体。
 * - createDiscovery: POST /api/capture/discovery
 * - attachImage: POST /api/capture/attach
 * - deleteDiscovery: DELETE /api/capture/discovery?id=
 * - fetchDiscoveryStatus: GET /api/capture/status?discoveryId= (poll 用)
 * identify 起動は _shared/ai identifyPlant を再利用 (triggerIdentify)。
 *
 * 関連: docs/capture/001_capture_SPEC.md §1 UC1, 003_capture_UNIT_TEST.md §1.4 (UT-CA-A01〜A04)
 */
import { CaptureError } from './errors';
import type { CapturePipelineInput } from './flow';
import type { DiscoveryStatus } from '../../shared/types/domain';

export type CaptureApiOptions = {
  token: string;
  fetchFn?: typeof fetch;
};

const DISCOVERY_ENDPOINT = '/api/capture/discovery';
const ATTACH_ENDPOINT = '/api/capture/attach';
const STATUS_ENDPOINT = '/api/capture/status';

function authHeaders(token: string): Record<string, string> {
  return { authorization: `Bearer ${token}`, 'content-type': 'application/json' };
}

/** discoveries INSERT (status=identifying) → discoveryId (UT-CA-A01)。403 は RLS reject (A04)。 */
export async function createDiscovery(
  input: Omit<CapturePipelineInput, 'userId'>,
  opts: CaptureApiOptions,
): Promise<string> {
  const fetchFn = opts.fetchFn ?? fetch;
  const res = await fetchFn(DISCOVERY_ENDPOINT, {
    method: 'POST',
    headers: authHeaders(opts.token),
    body: JSON.stringify({
      capturedAt: input.capturedAt,
      season: input.season,
      location: input.location,
      userNote: input.userNote,
    }),
  });
  if (!res.ok) {
    throw new CaptureError(`createDiscovery failed: ${res.status}`);
  }
  const body = (await res.json()) as { discoveryId: string };
  return body.discoveryId;
}

/** images INSERT + discoveries.image_id UPDATE (UT-CA-A02)。 */
export async function attachImage(
  discoveryId: string,
  objectKey: string,
  sizeBytes: number,
  opts: CaptureApiOptions,
): Promise<void> {
  const fetchFn = opts.fetchFn ?? fetch;
  const res = await fetchFn(ATTACH_ENDPOINT, {
    method: 'POST',
    headers: authHeaders(opts.token),
    body: JSON.stringify({ discoveryId, objectKey, sizeBytes }),
  });
  if (!res.ok) {
    throw new CaptureError(`attachImage failed: ${res.status}`);
  }
}

/** discoveries 削除 (upload 失敗時ロールバック、UT-CA-CF03)。 */
export async function deleteDiscovery(discoveryId: string, opts: CaptureApiOptions): Promise<void> {
  const fetchFn = opts.fetchFn ?? fetch;
  const res = await fetchFn(`${DISCOVERY_ENDPOINT}?id=${encodeURIComponent(discoveryId)}`, {
    method: 'DELETE',
    headers: authHeaders(opts.token),
  });
  if (!res.ok) {
    throw new CaptureError(`deleteDiscovery failed: ${res.status}`);
  }
}

export type DiscoveryStatusResult = {
  discoveryId: string;
  status: DiscoveryStatus;
  commonName: string | null;
  scientificName: string | null;
  confidence: number | null;
};

/** discovery の現在ステータスを取得する (poll 用)。 */
export async function fetchDiscoveryStatus(
  discoveryId: string,
  opts: CaptureApiOptions,
): Promise<DiscoveryStatusResult> {
  const fetchFn = opts.fetchFn ?? fetch;
  const res = await fetchFn(`${STATUS_ENDPOINT}?discoveryId=${encodeURIComponent(discoveryId)}`, {
    method: 'GET',
    headers: authHeaders(opts.token),
  });
  if (!res.ok) {
    throw new CaptureError(`fetchDiscoveryStatus failed: ${res.status}`);
  }
  return (await res.json()) as DiscoveryStatusResult;
}

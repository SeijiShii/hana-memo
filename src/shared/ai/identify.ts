/**
 * AI 植物同定 (frontend) — `POST /api/identify-plant` ラッパ
 *
 * HTTP ステータスをドメイン例外にマップする:
 * 402 → QuotaExceededError / 401 → LinkRequiredError / 429 → RateLimitedError /
 * その他失敗・network → AiServiceError。
 *
 * 関連: docs/_shared/ai/001_ai_SPEC.md §1.1/§4.1, 003_ai_UNIT_TEST.md §1.1 (UT-AI-F01〜F06)
 */
import type { IdentifyInput, IdentifyResult } from '../types/ai';
import { QuotaExceededError, AiServiceError, RateLimitedError } from './errors';
import { LinkRequiredError } from '../auth/errors';

const IDENTIFY_ENDPOINT = '/api/identify-plant';

export type IdentifyClientOptions = {
  token: string;
  fetchFn?: typeof fetch;
  endpoint?: string;
};

/** `/api/identify-plant` を呼び出し IdentifyResult を返す。失敗はドメイン例外に変換。 */
export async function identifyPlant(
  input: IdentifyInput,
  opts: IdentifyClientOptions,
): Promise<IdentifyResult> {
  const fetchFn = opts.fetchFn ?? fetch;
  let res: Response;
  try {
    res = await fetchFn(opts.endpoint ?? IDENTIFY_ENDPOINT, {
      method: 'POST',
      headers: { authorization: `Bearer ${opts.token}`, 'content-type': 'application/json' },
      body: JSON.stringify(input),
    });
  } catch (err) {
    console.error('identifyPlant: network error', err);
    throw new AiServiceError('identify network error', err);
  }

  if (res.ok) {
    return (await res.json()) as IdentifyResult;
  }
  if (res.status === 402) {
    throw new QuotaExceededError();
  }
  if (res.status === 401) {
    throw new LinkRequiredError();
  }
  if (res.status === 429) {
    const body = (await res.json().catch(() => ({}))) as { retryAtMs?: number };
    throw new RateLimitedError(body.retryAtMs ?? 0);
  }
  throw new AiServiceError(`identify failed: ${res.status}`);
}

/**
 * pending discovery を再識別する。capture が保持する元 IdentifyInput を同じ payload で再送する
 * (UT-AI-F06)。
 */
export async function retryIdentify(
  input: IdentifyInput,
  opts: IdentifyClientOptions,
): Promise<IdentifyResult> {
  return identifyPlant(input, opts);
}

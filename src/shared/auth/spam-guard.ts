/**
 * SPAM 抑止 (client fingerprint + trial 上限の遠隔判定)
 *
 * - `getFingerprint`: @fingerprintjs/fingerprintjs の visitorId を SHA-256 で 64-char hex 化。
 *   失敗時は UA + screen の弱 fingerprint に fallback (E-AU-005)。
 * - `enforceTrialLimitRemote`: `/api/auth/spam-check` を叩き、返却 quota を `enforceTrialLimit`
 *   (純関数) に渡して超過時 LinkRequiredError を throw する (E-AU-004)。
 *
 * 関連: docs/_shared/auth/001_auth_SPEC.md §1.1/§1.3, 003_auth_UNIT_TEST.md §1.3 (UT-AU-G01/G02/G06/G07)
 */
import { sha256Hex } from '../helpers/id';
import { enforceTrialLimit, type TrialQuota } from './trial';

/** fingerprintjs の最小インターフェース (テスト注入可能)。 */
export type FingerprintAgent = { get: () => Promise<{ visitorId: string }> };

export type GetFingerprintDeps = {
  /** fingerprintjs ローダ (既定は動的 import)。 */
  load?: () => Promise<FingerprintAgent>;
  /** ハッシュ関数 (既定は WebCrypto SHA-256)。 */
  hash?: (input: string) => Promise<string>;
};

async function defaultLoad(): Promise<FingerprintAgent> {
  const FingerprintJS = (await import('@fingerprintjs/fingerprintjs')).default;
  return FingerprintJS.load();
}

/** UA + screen から弱い fingerprint 種を作る (fallback、E-AU-005)。 */
function weakFingerprintSeed(): string {
  const ua = typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown-ua';
  const screenDims =
    typeof screen !== 'undefined' ? `${screen.width}x${screen.height}x${screen.colorDepth}` : '0x0';
  const tz =
    typeof Intl !== 'undefined' ? Intl.DateTimeFormat().resolvedOptions().timeZone : 'unknown-tz';
  return `weak:${ua}|${screenDims}|${tz}`;
}

/**
 * デバイス fingerprint を 64-char hex (SHA-256) で返す。
 * fingerprintjs が失敗したら弱 fingerprint に fallback し console.warn する。
 */
export async function getFingerprint(deps: GetFingerprintDeps = {}): Promise<string> {
  const hash = deps.hash ?? sha256Hex;
  try {
    const agent = await (deps.load ?? defaultLoad)();
    const { visitorId } = await agent.get();
    return hash(visitorId);
  } catch (err) {
    console.warn('getFingerprint: fingerprintjs failed, using weak fallback.', err);
    return hash(weakFingerprintSeed());
  }
}

/** `/api/auth/spam-check` のレスポンス body。 */
export type SpamCheckResponse = TrialQuota;

/**
 * trial 上限を遠隔判定し、超過なら LinkRequiredError を throw する。
 * @returns 範囲内なら quota を返す
 */
export async function enforceTrialLimitRemote(opts: {
  /** Clerk session token (Authorization: Bearer) */
  token: string;
  fingerprint: string;
  fetchFn?: typeof fetch;
  endpoint?: string;
}): Promise<TrialQuota> {
  const fetchFn = opts.fetchFn ?? fetch;
  const res = await fetchFn(opts.endpoint ?? '/api/auth/spam-check', {
    method: 'POST',
    headers: {
      authorization: `Bearer ${opts.token}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({ fingerprint: opts.fingerprint }),
  });
  if (!res.ok) {
    throw new Error(`spam-check failed: ${res.status}`);
  }
  const quota = (await res.json()) as TrialQuota;
  enforceTrialLimit(quota);
  return quota;
}

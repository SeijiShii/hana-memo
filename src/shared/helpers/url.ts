// URL ガード ([SEC-003] SSRF 防御、[SEC-005] path traversal 防御)
// 関連: docs/_shared/ai/revise_sec_001-003_rate_limit_ssrf_20260523/001_REVISE_SPEC.md §7.4

export class SsrfError extends Error {
  constructor(public readonly reason: string) {
    super(`SSRF: ${reason}`);
    this.name = 'SsrfError';
  }
}

export class ValidationError extends Error {
  constructor(public readonly reason: string) {
    super(`Validation: ${reason}`);
    this.name = 'ValidationError';
  }
}

/** R2 Presigned URL の allowlist ホスト */
const DEFAULT_ALLOW_HOSTS_ENV = 'ALLOW_IMAGE_HOSTS'; // comma-separated env

/** private IP / link-local パターン (Node 22 文字列マッチ) */
const PRIVATE_IPV4_PATTERNS: RegExp[] = [
  /^10\./,
  /^172\.(1[6-9]|2\d|3[01])\./,
  /^192\.168\./,
  /^169\.254\./,
  /^127\./,
  /^0\./,
];
const PRIVATE_IPV6_PATTERNS: RegExp[] = [/^::1$/, /^fc00:/i, /^fe80:/i];

function isPrivateIp(addr: string): boolean {
  return (
    PRIVATE_IPV4_PATTERNS.some((re) => re.test(addr)) ||
    PRIVATE_IPV6_PATTERNS.some((re) => re.test(addr))
  );
}

function getAllowHosts(): string[] {
  const raw = (globalThis as { process?: { env?: Record<string, string | undefined> } })
    .process?.env?.[DEFAULT_ALLOW_HOSTS_ENV];
  if (!raw) return [];
  return raw.split(',').map((s) => s.trim()).filter(Boolean);
}

/**
 * 画像 URL の SSRF guard (Vercel Function 内で OpenAI Vision に渡す前)
 * - https のみ
 * - allowlist ホスト一致
 * - DNS resolve 後の IP が private でないこと (defense-in-depth)
 */
export async function assertSafeImageUrl(
  input: string,
  opts?: { allowHosts?: string[]; resolveDns?: (host: string) => Promise<string[]> },
): Promise<void> {
  const url = new URL(input); // throws on invalid
  if (url.protocol !== 'https:') {
    throw new SsrfError('protocol must be https');
  }
  const allowHosts = opts?.allowHosts ?? getAllowHosts();
  if (allowHosts.length > 0 && !allowHosts.includes(url.hostname)) {
    throw new SsrfError(`host not in allowlist: ${url.hostname}`);
  }
  // hostname が literal private IP の場合
  if (isPrivateIp(url.hostname)) {
    throw new SsrfError(`private IP literal: ${url.hostname}`);
  }
  // DNS resolve (optional injection for testability)
  const resolveDns = opts?.resolveDns;
  if (resolveDns) {
    const addrs = await resolveDns(url.hostname);
    for (const addr of addrs) {
      if (isPrivateIp(addr)) {
        throw new SsrfError(`DNS resolved to private IP: ${addr}`);
      }
    }
  }
}

/**
 * R2 objectKey の検証 ([SEC-003]、path traversal + userId プレフィックス強制)
 * 仕様: ${userId}/... 形式、`..` 含まない、長さ ≤ 256
 */
export function validateObjectKey(key: string, userId: string): void {
  if (typeof key !== 'string' || key.length === 0) {
    throw new ValidationError('key must be non-empty string');
  }
  if (typeof userId !== 'string' || userId.length === 0) {
    throw new ValidationError('userId must be non-empty string');
  }
  if (key.length > 256) {
    throw new ValidationError('key too long');
  }
  if (key.includes('..')) {
    throw new ValidationError('path traversal');
  }
  if (!key.startsWith(`${userId}/`)) {
    throw new ValidationError('userId prefix mismatch');
  }
}

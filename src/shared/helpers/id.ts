// ID + ハッシュヘルパ
// 関連: docs/_shared/helpers/001_helpers_SPEC.md §1.5
//      docs/_shared/analytics/revise_sec_004_sentry_pii_scrub_20260523/001_REVISE_SPEC.md §7.2 (sha256Hex)

export function generateUuid(): string {
  // 標準 crypto.randomUUID (Node 19+ / モダンブラウザ)
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  // fallback (古いブラウザ、極稀): RFC 4122 v4 風
  const r = (n: number) => Math.floor(Math.random() * n);
  const hex = (n: number) => r(16 ** n).toString(16).padStart(n, '0');
  return `${hex(8)}-${hex(4)}-4${hex(3)}-${(8 + r(4)).toString(16)}${hex(3)}-${hex(12)}`;
}

/** SHA-256 hex 文字列 (Web Crypto SubtleCrypto、Node 20+ globalThis.crypto.subtle 利用可) */
export async function sha256Hex(input: string): Promise<string> {
  if (typeof input !== 'string') {
    throw new TypeError('sha256Hex requires a string input');
  }
  const bytes = new TextEncoder().encode(input);
  const buf = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/** IP アドレスを salted SHA-256 でハッシュ化 (consent_logs.ip_hash 用) */
export async function hashIp(ip: string, salt: string): Promise<string> {
  if (!ip || typeof ip !== 'string') {
    throw new TypeError('hashIp: ip must be non-empty string');
  }
  if (!salt || typeof salt !== 'string') {
    throw new TypeError('hashIp: salt must be non-empty string');
  }
  return sha256Hex(`${salt}:${ip}`);
}

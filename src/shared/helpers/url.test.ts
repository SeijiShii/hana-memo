// [SEC-003] SSRF guard + [SEC-005 関連] validateObjectKey tests
import { describe, it, expect } from 'vitest';
import {
  assertSafeImageUrl,
  validateObjectKey,
  SsrfError,
  ValidationError,
} from './url';

const ALLOW = ['account.r2.cloudflarestorage.com'];

describe('assertSafeImageUrl', () => {
  it('passes allowlisted https URL', async () => {
    await expect(
      assertSafeImageUrl('https://account.r2.cloudflarestorage.com/path/img.webp', {
        allowHosts: ALLOW,
      }),
    ).resolves.toBeUndefined();
  });

  it('rejects http (not https)', async () => {
    await expect(
      assertSafeImageUrl('http://account.r2.cloudflarestorage.com/x.webp', {
        allowHosts: ALLOW,
      }),
    ).rejects.toThrow(SsrfError);
  });

  it('rejects host not in allowlist', async () => {
    await expect(
      assertSafeImageUrl('https://evil.com/x.webp', { allowHosts: ALLOW }),
    ).rejects.toThrow(SsrfError);
  });

  it('rejects file:// protocol', async () => {
    await expect(assertSafeImageUrl('file:///etc/passwd', { allowHosts: ALLOW })).rejects.toThrow();
  });

  it('rejects private IPv4 literal', async () => {
    await expect(
      assertSafeImageUrl('https://10.0.0.1/x', { allowHosts: ['10.0.0.1'] }),
    ).rejects.toThrow(SsrfError);
  });

  it('rejects link-local IPv4 literal (169.254)', async () => {
    await expect(
      assertSafeImageUrl('https://169.254.169.254/', { allowHosts: ['169.254.169.254'] }),
    ).rejects.toThrow(SsrfError);
  });

  it('rejects loopback IPv4 literal (127.x)', async () => {
    await expect(
      assertSafeImageUrl('https://127.0.0.1/x', { allowHosts: ['127.0.0.1'] }),
    ).rejects.toThrow(SsrfError);
  });

  it('rejects DNS-resolved private IP', async () => {
    const resolveDns = async () => ['10.0.0.5'];
    await expect(
      assertSafeImageUrl('https://account.r2.cloudflarestorage.com/x.webp', {
        allowHosts: ALLOW,
        resolveDns,
      }),
    ).rejects.toThrow(SsrfError);
  });

  it('passes DNS-resolved public IP', async () => {
    const resolveDns = async () => ['8.8.8.8'];
    await expect(
      assertSafeImageUrl('https://account.r2.cloudflarestorage.com/x.webp', {
        allowHosts: ALLOW,
        resolveDns,
      }),
    ).resolves.toBeUndefined();
  });

  it('rejects mixed DNS (1 public + 1 private)', async () => {
    const resolveDns = async () => ['8.8.8.8', '10.0.0.1'];
    await expect(
      assertSafeImageUrl('https://account.r2.cloudflarestorage.com/x.webp', {
        allowHosts: ALLOW,
        resolveDns,
      }),
    ).rejects.toThrow(SsrfError);
  });

  it('rejects invalid URL string', async () => {
    await expect(assertSafeImageUrl('not-a-url', { allowHosts: ALLOW })).rejects.toThrow();
  });
});

describe('validateObjectKey', () => {
  it('passes valid userId-prefixed key', () => {
    expect(() => validateObjectKey('user_abc/2026/05/img.webp', 'user_abc')).not.toThrow();
  });

  it('rejects path traversal (..)', () => {
    expect(() => validateObjectKey('../user_xyz/img.webp', 'user_abc')).toThrow(ValidationError);
  });

  it("rejects path traversal embedded ('foo/..bar')", () => {
    expect(() => validateObjectKey('user_abc/foo/..bar', 'user_abc')).toThrow(ValidationError);
  });

  it('rejects different userId prefix', () => {
    expect(() => validateObjectKey('user_xyz/img.webp', 'user_abc')).toThrow(ValidationError);
  });

  it('rejects empty key', () => {
    expect(() => validateObjectKey('', 'user_abc')).toThrow(ValidationError);
  });

  it('rejects key longer than 256', () => {
    const k = 'user_abc/' + 'a'.repeat(250);
    expect(() => validateObjectKey(k, 'user_abc')).toThrow(ValidationError);
  });

  it('rejects empty userId', () => {
    expect(() => validateObjectKey('user_abc/x', '')).toThrow(ValidationError);
  });

  it('rejects non-string inputs', () => {
    // @ts-expect-error
    expect(() => validateObjectKey(null, 'user_abc')).toThrow(ValidationError);
    // @ts-expect-error
    expect(() => validateObjectKey('user_abc/x', undefined)).toThrow(ValidationError);
  });
});

describe('SsrfError / ValidationError', () => {
  it('SsrfError has correct name + reason', () => {
    const e = new SsrfError('host');
    expect(e.name).toBe('SsrfError');
    expect(e.message).toContain('host');
    expect(e.reason).toBe('host');
  });

  it('ValidationError has correct name + reason', () => {
    const e = new ValidationError('path traversal');
    expect(e.name).toBe('ValidationError');
    expect(e.reason).toBe('path traversal');
  });
});

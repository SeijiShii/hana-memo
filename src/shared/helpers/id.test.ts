import { describe, it, expect } from 'vitest';
import { generateUuid, sha256Hex, hashIp } from './id';

describe('generateUuid', () => {
  it('returns a 36-char UUID-like string', () => {
    const u = generateUuid();
    expect(typeof u).toBe('string');
    expect(u).toMatch(/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i);
  });

  it('returns unique values', () => {
    const a = generateUuid();
    const b = generateUuid();
    expect(a).not.toBe(b);
  });
});

describe('sha256Hex', () => {
  it('returns 64-char hex string', async () => {
    const hex = await sha256Hex('hello');
    expect(hex).toMatch(/^[a-f0-9]{64}$/);
  });

  it('is deterministic', async () => {
    expect(await sha256Hex('test')).toBe(await sha256Hex('test'));
  });

  it('different inputs produce different hashes', async () => {
    expect(await sha256Hex('a')).not.toBe(await sha256Hex('b'));
  });

  it('throws on non-string input', async () => {
    // @ts-expect-error
    await expect(sha256Hex(123)).rejects.toThrow(TypeError);
    // @ts-expect-error
    await expect(sha256Hex(null)).rejects.toThrow(TypeError);
  });

  it("hashes 'hello' to known value", async () => {
    const hex = await sha256Hex('hello');
    expect(hex).toBe('2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824');
  });
});

describe('hashIp', () => {
  it('produces stable hash with salt', async () => {
    expect(await hashIp('192.168.1.1', 'salt')).toBe(await hashIp('192.168.1.1', 'salt'));
  });

  it('different salts → different hashes', async () => {
    expect(await hashIp('192.168.1.1', 'a')).not.toBe(await hashIp('192.168.1.1', 'b'));
  });

  it('different IPs → different hashes', async () => {
    expect(await hashIp('1.1.1.1', 'salt')).not.toBe(await hashIp('2.2.2.2', 'salt'));
  });

  it('throws on empty ip', async () => {
    await expect(hashIp('', 'salt')).rejects.toThrow(TypeError);
  });

  it('throws on empty salt', async () => {
    await expect(hashIp('1.1.1.1', '')).rejects.toThrow(TypeError);
  });

  it('returns 64-char hex', async () => {
    expect(await hashIp('1.1.1.1', 'salt')).toMatch(/^[a-f0-9]{64}$/);
  });
});

import { describe, it, expect } from 'vitest';
import { guestRateKey, clientIpFrom } from './guest';

describe('guestRateKey', () => {
  it('fingerprint を優先する', () => {
    expect(guestRateKey({ fingerprint: 'fp1', ip: '1.2.3.4' })).toBe('guest:fp1');
  });
  it('fingerprint 空なら IP を使う', () => {
    expect(guestRateKey({ fingerprint: '', ip: '1.2.3.4' })).toBe('guest:1.2.3.4');
    expect(guestRateKey({ fingerprint: '   ', ip: '1.2.3.4' })).toBe('guest:1.2.3.4');
  });
  it('どちらも無ければ anon', () => {
    expect(guestRateKey({})).toBe('guest:anon');
    expect(guestRateKey({ ip: null })).toBe('guest:anon');
  });
});

describe('clientIpFrom', () => {
  it('x-forwarded-for の先頭 IP を取る', () => {
    expect(clientIpFrom('9.9.9.9, 10.0.0.1')).toBe('9.9.9.9');
  });
  it('null / 空は null', () => {
    expect(clientIpFrom(null)).toBeNull();
    expect(clientIpFrom('')).toBeNull();
  });
});

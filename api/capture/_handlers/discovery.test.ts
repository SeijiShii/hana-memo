/**
 * capture/discovery 単体テスト (parseCreateDiscoveryBody 検証)
 * 由来: docs/capture/003_capture_UNIT_TEST.md §1.4 (UT-CA-A01) + §1.8 (UT-CA-E03 メモ trim)
 */
import { describe, it, expect } from 'vitest';
import { parseCreateDiscoveryBody } from './discovery';

describe('parseCreateDiscoveryBody', () => {
  it('必須 (capturedAt/season) を正規化', () => {
    expect(parseCreateDiscoveryBody({ capturedAt: '2026-05-24T00:00:00Z', season: 'spring' })).toEqual({
      capturedAt: '2026-05-24T00:00:00Z',
      season: 'spring',
    });
  });

  it('location / userNote を含めて正規化', () => {
    const out = parseCreateDiscoveryBody({
      capturedAt: '2026-05-24T00:00:00Z',
      season: 'summer',
      location: { lat: 35, lng: 139 },
      userNote: '  道端のタンポポ  ',
    });
    expect(out.location).toEqual({ lat: 35, lng: 139 });
    expect(out.userNote).toBe('道端のタンポポ');
  });

  it('UT-CA-E03: 補助メモ 201 文字 → 200 に trim', () => {
    const out = parseCreateDiscoveryBody({
      capturedAt: '2026-05-24T00:00:00Z',
      season: 'spring',
      userNote: 'あ'.repeat(201),
    });
    expect(out.userNote).toHaveLength(200);
  });

  it('capturedAt / season 欠落は throw', () => {
    expect(() => parseCreateDiscoveryBody({ season: 'spring' })).toThrow();
    expect(() => parseCreateDiscoveryBody({ capturedAt: 'x' })).toThrow();
  });

  it('不正 location は無視 (location 未設定)', () => {
    const out = parseCreateDiscoveryBody({
      capturedAt: '2026-05-24T00:00:00Z',
      season: 'spring',
      location: { lat: 'bad' },
    });
    expect(out.location).toBeUndefined();
  });
});

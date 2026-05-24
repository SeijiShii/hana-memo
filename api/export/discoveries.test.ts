/**
 * export/discoveries 単体テスト (toDiscoveryCsvRow / parseMonthParam)
 * 由来: docs/export/003_export_UNIT_TEST.md (E-EX-002 データ整形)
 */
import { describe, it, expect } from 'vitest';
import { toDiscoveryCsvRow, parseMonthParam } from './discoveries';

describe('toDiscoveryCsvRow', () => {
  it('user 編集名 > common_name の優先順で表示名解決', () => {
    const row = toDiscoveryCsvRow({
      id: 'd1',
      commonName: 'AI名',
      userOverriddenName: 'ユーザー名',
      scientificName: 'Sci',
      status: 'identified',
      capturedAt: new Date('2026-04-01T00:00:00Z'),
      season: 'spring',
      locationLat: 35,
      locationLng: 139,
      userNote: 'メモ',
    });
    expect(row.common_name).toBe('ユーザー名');
    expect(row.captured_at).toBe('2026-04-01T00:00:00.000Z');
    expect(row.lat).toBe(35);
  });

  it('null フィールドは空文字 / 空数値に正規化', () => {
    const row = toDiscoveryCsvRow({
      id: 'd2',
      commonName: null,
      userOverriddenName: null,
      scientificName: null,
      status: 'pending',
      capturedAt: new Date('2026-04-01T00:00:00Z'),
      season: null,
      locationLat: null,
      locationLng: null,
      userNote: null,
    });
    expect(row.common_name).toBe('');
    expect(row.scientific_name).toBe('');
    expect(row.lat).toBe('');
    expect(row.user_note).toBe('');
  });
});

describe('parseMonthParam', () => {
  it('YYYY-MM は通す', () => {
    expect(parseMonthParam('2026-04')).toBe('2026-04');
  });
  it('不正 / null は null', () => {
    expect(parseMonthParam('2026-4')).toBeNull();
    expect(parseMonthParam('bad')).toBeNull();
    expect(parseMonthParam(null)).toBeNull();
  });
});

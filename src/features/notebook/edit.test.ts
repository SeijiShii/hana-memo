/**
 * edit.ts 単体テスト (UC4 編集)
 */
import { describe, it, expect } from 'vitest';
import {
  sanitizeCommonName,
  sanitizeNoteField,
  validateLocation,
  resolveDisplayName,
  buildEditRecord,
  MAX_COMMON_NAME,
  MAX_USER_NOTE,
} from './edit';
import { NotebookError } from './errors';
import type { NotebookDiscovery } from './types';

describe('sanitize', () => {
  it('common_name trim + 100 cap、空→undefined', () => {
    expect(sanitizeCommonName('  タンポポ  ')).toBe('タンポポ');
    expect(sanitizeCommonName('あ'.repeat(120))).toHaveLength(MAX_COMMON_NAME);
    expect(sanitizeCommonName('   ')).toBeUndefined();
    expect(sanitizeCommonName(null)).toBeUndefined();
  });
  it('user_note trim + 500 cap', () => {
    expect(sanitizeNoteField('あ'.repeat(600))).toHaveLength(MAX_USER_NOTE);
    expect(sanitizeNoteField(undefined)).toBeUndefined();
  });
});

describe('validateLocation', () => {
  it('範囲内 → OK', () => {
    expect(() => validateLocation(35.681, 139.767)).not.toThrow();
    expect(() => validateLocation(-90, 180)).not.toThrow();
  });
  it('範囲外 → NotebookError', () => {
    expect(() => validateLocation(91, 0)).toThrow(NotebookError);
    expect(() => validateLocation(0, 181)).toThrow(NotebookError);
    expect(() => validateLocation(NaN, 0)).toThrow(NotebookError);
  });
});

describe('resolveDisplayName', () => {
  const base: NotebookDiscovery = {
    id: 'x',
    commonName: 'AI 名',
    originalCommonName: 'AI 名',
    userOverriddenName: null,
    scientificName: 'X',
    status: 'identified',
    capturedAt: '2026-05-01T00:00:00Z',
    season: 'spring',
  };
  it('user 編集値を最優先', () => {
    expect(resolveDisplayName({ ...base, userOverriddenName: 'ユーザー名' })).toBe('ユーザー名');
  });
  it('編集値なし → AI 名', () => {
    expect(resolveDisplayName(base)).toBe('AI 名');
  });
  it('全 null → 不明', () => {
    expect(
      resolveDisplayName({ ...base, commonName: null, originalCommonName: null, userOverriddenName: null }),
    ).toBe('不明');
  });
});

describe('buildEditRecord', () => {
  it('append-only レコード構築', () => {
    expect(buildEditRecord('disc_1', 'user_1', 'common_name', 'AI 名', 'ユーザー名')).toEqual({
      discoveryId: 'disc_1',
      userId: 'user_1',
      fieldName: 'common_name',
      beforeValue: 'AI 名',
      afterValue: 'ユーザー名',
    });
  });
  it('id 欠落 → NotebookError', () => {
    expect(() => buildEditRecord('', 'user_1', 'user_note', null, 'x')).toThrow(NotebookError);
  });
});

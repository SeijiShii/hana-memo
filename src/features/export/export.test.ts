/**
 * export コア単体テスト (csv / validation / filename)
 * 由来: 001_export_SPEC.md §4 (E-EX-001/003/004/005) + UC1/UC2/UC4
 */
import { describe, it, expect } from 'vitest';
import { toCsv, escapeCsvField, UTF8_BOM, DISCOVERY_CSV_COLUMNS } from './csv';
import {
  validateMonthRange,
  validatePdfCount,
  requirePdfUnlocked,
  PDF_MAX_COUNT,
} from './validation';
import { pdfFilename, csvZipFilename, imagesZipFilename } from './filename';
import { ExportError } from './errors';

describe('escapeCsvField', () => {
  it('カンマ/引用符/改行を含む → "" で囲む + " を ""', () => {
    expect(escapeCsvField('a,b')).toBe('"a,b"');
    expect(escapeCsvField('a"b')).toBe('"a""b"');
    expect(escapeCsvField('a\nb')).toBe('"a\nb"');
  });
  it('通常文字列はそのまま、null/undefined は空', () => {
    expect(escapeCsvField('plain')).toBe('plain');
    expect(escapeCsvField(null)).toBe('');
    expect(escapeCsvField(undefined)).toBe('');
    expect(escapeCsvField(42)).toBe('42');
  });
});

describe('toCsv', () => {
  it('E-EX-005: デフォルトで UTF-8 BOM 付加', () => {
    const csv = toCsv([{ id: '1', common_name: 'タンポポ' }], ['id', 'common_name']);
    expect(csv.startsWith(UTF8_BOM)).toBe(true);
  });
  it('bom:false で BOM なし、ヘッダ + 行', () => {
    const csv = toCsv([{ id: '1', name: 'a,b' }], ['id', 'name'], { bom: false });
    expect(csv).toBe('id,name\n1,"a,b"');
  });
  it('欠落カラムは空', () => {
    const csv = toCsv([{ id: '1' }], ['id', 'missing'], { bom: false });
    expect(csv).toBe('id,missing\n1,');
  });
  it('DISCOVERY_CSV_COLUMNS は 9 列', () => {
    expect(DISCOVERY_CSV_COLUMNS).toHaveLength(9);
  });
});

describe('validateMonthRange', () => {
  it('start <= end / 片方のみ / 両方なし → OK', () => {
    expect(() => validateMonthRange('2026-01', '2026-05')).not.toThrow();
    expect(() => validateMonthRange('2026-05', '2026-05')).not.toThrow();
    expect(() => validateMonthRange(undefined, undefined)).not.toThrow();
    expect(() => validateMonthRange('2026-05', undefined)).not.toThrow();
  });
  it('start > end → ExportError', () => {
    expect(() => validateMonthRange('2026-06', '2026-05')).toThrow(ExportError);
  });
});

describe('validatePdfCount', () => {
  it('1〜200 → OK', () => {
    expect(() => validatePdfCount(1)).not.toThrow();
    expect(() => validatePdfCount(PDF_MAX_COUNT)).not.toThrow();
  });
  it('E-EX-003: 0 件 → ExportError', () => {
    expect(() => validatePdfCount(0)).toThrow(ExportError);
  });
  it('E-EX-001: 201 件 → ExportError', () => {
    expect(() => validatePdfCount(201)).toThrow(ExportError);
  });
});

describe('requirePdfUnlocked', () => {
  it('E-EX-004: 未 unlock → ExportError', () => {
    expect(() => requirePdfUnlocked(false)).toThrow(ExportError);
  });
  it('unlock 済 → OK', () => {
    expect(() => requirePdfUnlocked(true)).not.toThrow();
  });
});

describe('filename', () => {
  it('pdfFilename', () => {
    expect(pdfFilename('2026-05', 12)).toBe('hanamemo_2026-05_12件.pdf');
  });
  it('csvZipFilename: userId 先頭 8 文字', () => {
    expect(csvZipFilename('user_abcdef123456', '20260523')).toBe(
      'hanamemo_export_user_abc_20260523.zip',
    );
  });
  it('imagesZipFilename', () => {
    expect(imagesZipFilename('20260523')).toBe('hanamemo_images_20260523.zip');
  });
});

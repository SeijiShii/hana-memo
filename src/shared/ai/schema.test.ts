/**
 * schema.ts 単体テスト
 * 由来: 003_ai_UNIT_TEST.md §1.4 (UT-AI-S01〜S06) + §1.7 (E01)
 */
import { describe, it, expect } from 'vitest';
import { parseIdentifyResponse, deriveStatus, IDENTIFY_SCHEMA } from './schema';
import { SchemaValidationError } from './errors';

const valid = {
  common_name: 'タンポポ',
  scientific_name: 'Taraxacum officinale',
  family: 'キク科',
  genus: 'Taraxacum',
  key_features: ['黄色い花', 'ロゼット葉'],
  confidence: 0.82,
  similar_species: [{ common_name: 'ブタナ', reason_for_likely: '花が似ている' }],
};

describe('parseIdentifyResponse', () => {
  it('UT-AI-S01: 正常 JSON object → IdentifyResult (snake→camel)', () => {
    const r = parseIdentifyResponse(valid);
    expect(r.commonName).toBe('タンポポ');
    expect(r.scientificName).toBe('Taraxacum officinale');
    expect(r.keyFeatures).toEqual(['黄色い花', 'ロゼット葉']);
    expect(r.similarSpecies[0]).toEqual({
      commonName: 'ブタナ',
      reasonForLikely: '花が似ている',
    });
    expect(r.status).toBe('identified');
  });

  it('正常 JSON string もパース', () => {
    expect(parseIdentifyResponse(JSON.stringify(valid)).commonName).toBe('タンポポ');
  });

  it('UT-AI-S02: 必須フィールド欠落 → SchemaValidationError', () => {
    const { scientific_name: _omitScientificName, ...rest } = valid;
    expect(() => parseIdentifyResponse(rest)).toThrow(SchemaValidationError);
  });

  it('UT-AI-S03: confidence < 0.6 → pending', () => {
    expect(parseIdentifyResponse({ ...valid, confidence: 0.4 }).status).toBe('pending');
  });

  it('UT-AI-S04: confidence >= 0.6 → identified', () => {
    expect(parseIdentifyResponse({ ...valid, confidence: 0.6 }).status).toBe('identified');
  });

  it('UT-AI-S05: confidence = 0 → unknown', () => {
    expect(parseIdentifyResponse({ ...valid, confidence: 0 }).status).toBe('unknown');
  });

  it('UT-AI-S06: similar_species > 3 → SchemaValidationError', () => {
    const many = Array.from({ length: 4 }, () => ({
      common_name: 'x',
      reason_for_likely: 'y',
    }));
    expect(() => parseIdentifyResponse({ ...valid, similar_species: many })).toThrow(
      SchemaValidationError,
    );
  });

  it('key_features 空 / 6 件 → SchemaValidationError', () => {
    expect(() => parseIdentifyResponse({ ...valid, key_features: [] })).toThrow(
      SchemaValidationError,
    );
    expect(() =>
      parseIdentifyResponse({
        ...valid,
        key_features: ['a', 'b', 'c', 'd', 'e', 'f'],
      }),
    ).toThrow(SchemaValidationError);
  });

  it('confidence 範囲外 → SchemaValidationError', () => {
    expect(() => parseIdentifyResponse({ ...valid, confidence: 1.5 })).toThrow(
      SchemaValidationError,
    );
  });

  it('UT-AI-E01: 空 string → SchemaValidationError', () => {
    expect(() => parseIdentifyResponse('')).toThrow(SchemaValidationError);
  });

  it('不正 JSON string → SchemaValidationError', () => {
    expect(() => parseIdentifyResponse('{not json')).toThrow(SchemaValidationError);
  });

  it('非オブジェクト → SchemaValidationError', () => {
    expect(() => parseIdentifyResponse(42)).toThrow(SchemaValidationError);
  });

  it('similar_species の要素が非オブジェクト → SchemaValidationError', () => {
    expect(() => parseIdentifyResponse({ ...valid, similar_species: ['not-object'] })).toThrow(
      SchemaValidationError,
    );
  });
});

describe('deriveStatus / IDENTIFY_SCHEMA', () => {
  it('境界: 0=unknown, 0.59=pending, 0.6=identified', () => {
    expect(deriveStatus(0)).toBe('unknown');
    expect(deriveStatus(0.59)).toBe('pending');
    expect(deriveStatus(0.6)).toBe('identified');
  });

  it('IDENTIFY_SCHEMA は required 7 フィールド + additionalProperties false', () => {
    expect(IDENTIFY_SCHEMA.required).toHaveLength(7);
    expect(IDENTIFY_SCHEMA.additionalProperties).toBe(false);
  });
});

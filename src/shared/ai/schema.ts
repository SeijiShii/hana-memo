/**
 * OpenAI Structured Output schema + パース (純関数)
 * 関連: docs/_shared/ai/001_ai_SPEC.md §3.1, 003_ai_UNIT_TEST.md §1.4 (UT-AI-S01〜S06)
 */
import type { IdentifyResult } from '../types/ai';
import { SchemaValidationError } from './errors';

/** OpenAI Chat Completions の response_format に渡す JSON schema */
export const IDENTIFY_SCHEMA = {
  type: 'object',
  properties: {
    common_name: { type: 'string' },
    scientific_name: { type: 'string' },
    family: { type: 'string' },
    genus: { type: 'string' },
    key_features: { type: 'array', items: { type: 'string' }, minItems: 1, maxItems: 5 },
    confidence: { type: 'number', minimum: 0, maximum: 1 },
    similar_species: {
      type: 'array',
      maxItems: 3,
      items: {
        type: 'object',
        properties: {
          common_name: { type: 'string' },
          reason_for_likely: { type: 'string' },
        },
        required: ['common_name', 'reason_for_likely'],
        // OpenAI Structured Outputs (strict) は入れ子オブジェクトにも additionalProperties:false 必須 (fix_002)
        additionalProperties: false,
      },
    },
  },
  required: [
    'common_name',
    'scientific_name',
    'family',
    'genus',
    'key_features',
    'confidence',
    'similar_species',
  ],
  additionalProperties: false,
} as const;

/** confidence → status 導出 (0=unknown / <0.6=pending / >=0.6=identified) */
export function deriveStatus(confidence: number): IdentifyResult['status'] {
  if (confidence === 0) return 'unknown';
  if (confidence < 0.6) return 'pending';
  return 'identified';
}

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

/**
 * OpenAI の構造化出力 (string or object) を IdentifyResult にパースする。
 * - string は JSON.parse (失敗で SchemaValidationError)
 * - 必須フィールド欠落 / 型不一致 / similar_species > 3 で SchemaValidationError
 */
export function parseIdentifyResponse(raw: unknown): IdentifyResult {
  let obj: unknown = raw;
  if (typeof raw === 'string') {
    if (raw.trim() === '') throw new SchemaValidationError('empty response');
    try {
      obj = JSON.parse(raw);
    } catch {
      throw new SchemaValidationError('invalid JSON');
    }
  }
  if (!isObject(obj)) throw new SchemaValidationError('not an object');

  const str = (k: string): string => {
    const v = obj[k];
    if (typeof v !== 'string') throw new SchemaValidationError(`missing/invalid field: ${k}`);
    return v;
  };

  const keyFeatures = obj.key_features;
  if (!Array.isArray(keyFeatures) || keyFeatures.length < 1 || keyFeatures.length > 5) {
    throw new SchemaValidationError('key_features must be array of 1-5');
  }

  const confidence = obj.confidence;
  if (typeof confidence !== 'number' || confidence < 0 || confidence > 1) {
    throw new SchemaValidationError('confidence must be number 0-1');
  }

  const similar = obj.similar_species;
  if (!Array.isArray(similar) || similar.length > 3) {
    throw new SchemaValidationError('similar_species must be array of <=3');
  }

  return {
    commonName: str('common_name'),
    scientificName: str('scientific_name'),
    family: str('family'),
    genus: str('genus'),
    keyFeatures: keyFeatures.map((f) => String(f)),
    confidence,
    similarSpecies: similar.map((s) => {
      if (!isObject(s)) throw new SchemaValidationError('similar_species item invalid');
      return {
        commonName: String(s.common_name ?? ''),
        reasonForLikely: String(s.reason_for_likely ?? ''),
      };
    }),
    status: deriveStatus(confidence),
  };
}

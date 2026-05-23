// OpenAI Vision (gpt-4o-mini) 入出力型
// 関連: docs/_shared/ai/001_ai_SPEC.md §1.3 §3.1
import type { Season } from './domain';

export type IdentifyInput = {
  discoveryId: string;
  imageObjectKey: string; // R2 object key (Vercel Function 内で presigned URL 化)
  capturedAt: string; // ISO 8601
  season: Season;
  location?: { lat: number; lng: number };
  userNote?: string;
};

export type SimilarSpecies = {
  commonName: string;
  reasonForLikely: string;
};

export type IdentifyResult = {
  commonName: string;
  scientificName: string;
  family: string;
  genus: string;
  keyFeatures: string[];
  confidence: number; // 0-1
  similarSpecies: SimilarSpecies[];
  status: 'identified' | 'pending' | 'unknown';
};

export type PlantCandidate = {
  commonName: string;
  scientificName: string;
  confidence: number;
};

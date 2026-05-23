/**
 * prompt.ts 単体テスト
 * 由来: 003_ai_UNIT_TEST.md §1.3 (UT-AI-P01〜P05)
 */
import { describe, it, expect } from 'vitest';
import { buildIdentifyPrompt, SYSTEM_PROMPT } from './prompt';
import type { IdentifyInput } from '../types/ai';

const base: IdentifyInput = {
  discoveryId: 'd1',
  imageObjectKey: 'u1/d1/i1.webp',
  capturedAt: '2026-05-22T13:14:00+09:00',
  season: 'spring',
  location: { lat: 35.681, lng: 139.767 },
  userNote: '葉が細長く花は白い',
};
const URL = 'https://r2.example/get/u1/d1/i1.webp';

describe('buildIdentifyPrompt', () => {
  it('UT-AI-P01: full input → system + user (画像 + 全メタ)', () => {
    const { system, user } = buildIdentifyPrompt(base, URL);
    expect(system).toBe(SYSTEM_PROMPT);
    expect(user).toContain(`画像: ${URL}`);
    expect(user).toContain('撮影日時: 2026-05-22T13:14:00+09:00');
    expect(user).toContain('季節: 春');
    expect(user).toContain('緯度 35.681, 経度 139.767');
    expect(user).toContain('ユーザーの補助メモ: 「葉が細長く花は白い」');
  });

  it('UT-AI-P02: location なし → 位置行なし', () => {
    const { user } = buildIdentifyPrompt({ ...base, location: undefined }, URL);
    expect(user).not.toContain('撮影位置');
  });

  it('UT-AI-P03: userNote なし → 補助メモ行なし', () => {
    const { user } = buildIdentifyPrompt({ ...base, userNote: undefined }, URL);
    expect(user).not.toContain('補助メモ');
  });

  it('UT-AI-P04: season=winter → 冬', () => {
    const { user } = buildIdentifyPrompt({ ...base, season: 'winter' }, URL);
    expect(user).toContain('季節: 冬');
  });

  it('UT-AI-P05: location 文字列フォーマット', () => {
    const { user } = buildIdentifyPrompt(base, URL);
    expect(user).toMatch(/緯度 35\.681, 経度 139\.767/);
  });
});

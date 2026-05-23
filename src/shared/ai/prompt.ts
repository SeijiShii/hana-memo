/**
 * OpenAI Vision プロンプト構築 (純関数)
 * 関連: docs/_shared/ai/001_ai_SPEC.md §3.2, 003_ai_UNIT_TEST.md §1.3 (UT-AI-P01〜P05)
 */
import type { Season } from '../types/domain';
import type { IdentifyInput } from '../types/ai';

const SEASON_JP: Record<Season, string> = {
  spring: '春',
  summer: '夏',
  autumn: '秋',
  winter: '冬',
};

export const SYSTEM_PROMPT = [
  'あなたは日本国内の植物識別のエキスパート植物学者です。',
  'ユーザーが撮影した植物画像と付帯メタを元に、最も可能性の高い種を JSON で返してください。',
  '不確実な場合は confidence を 0.6 未満にし、similar_species に候補を最大 3 つ挙げてください。',
  '学名はラテン語、その他は日本語で返してください。',
].join('\n');

export type IdentifyPrompt = { system: string; user: string };

/**
 * system / user メッセージを構築する。
 * imageUrl は Vercel Function 内で R2 presigned URL 化したもの (本関数はそれを受け取るだけ)。
 */
export function buildIdentifyPrompt(input: IdentifyInput, imageUrl: string): IdentifyPrompt {
  const lines: string[] = [
    `画像: ${imageUrl}`,
    `撮影日時: ${input.capturedAt}`,
    `季節: ${SEASON_JP[input.season]}`,
  ];
  if (input.location) {
    lines.push(
      `おおまかな撮影位置 (約100m精度): 緯度 ${input.location.lat}, 経度 ${input.location.lng}`,
    );
  }
  if (input.userNote) {
    lines.push(`ユーザーの補助メモ: 「${input.userNote}」`);
  }
  return { system: SYSTEM_PROMPT, user: lines.join('\n') };
}

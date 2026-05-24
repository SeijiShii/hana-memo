/**
 * OpenAI Vision (gpt-4o-mini) ラッパ (Vercel Function 専用)
 *
 * `buildIdentifyRequest` で Chat Completions リクエスト (structured output + 画像 detail=low) を構築し、
 * `callIdentifyVision` で呼び出して JSON 文字列を返す (パースは core `parseIdentifyResponse`)。
 * SDK 依存はこのファイルに隔離し、`ChatCompletionFn` を注入して unit test を SDK 非依存に保つ。
 *
 * 関連: docs/_shared/ai/001_ai_SPEC.md §3.1/§5.1, 002_ai_PLAN.md
 */
import OpenAI from 'openai';
import { IDENTIFY_SCHEMA } from '../../src/shared/ai/schema';
import { AiServiceError } from '../../src/shared/ai/errors';
import type { IdentifyPrompt } from '../../src/shared/ai/prompt';

/** コスト管理: gpt-4o-mini / detail=low / max_tokens=600 (§5.1 NFR)。 */
export const IDENTIFY_MODEL = 'gpt-4o-mini';
export const IDENTIFY_MAX_TOKENS = 600;

/** Chat Completions の最小シグネチャ (テスト注入用)。 */
export type ChatCompletionFn = (
  params: object,
) => Promise<{ choices: Array<{ message: { content: string | null } }> }>;

/** Chat Completions リクエストボディを構築する (純関数)。 */
export function buildIdentifyRequest(prompt: IdentifyPrompt, imageUrl: string): object {
  return {
    model: IDENTIFY_MODEL,
    max_tokens: IDENTIFY_MAX_TOKENS,
    messages: [
      { role: 'system', content: prompt.system },
      {
        role: 'user',
        content: [
          { type: 'text', text: prompt.user },
          { type: 'image_url', image_url: { url: imageUrl, detail: 'low' } },
        ],
      },
    ],
    response_format: {
      type: 'json_schema',
      json_schema: { name: 'plant_identification', strict: true, schema: IDENTIFY_SCHEMA },
    },
  };
}

/** 実 OpenAI client から ChatCompletionFn を生成する (api key は env)。 */
export function createChatCompletionFn(deps: { apiKey?: string } = {}): ChatCompletionFn {
  const apiKey = deps.apiKey ?? process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY is not set');
  }
  const client = new OpenAI({ apiKey });
  return (params) =>
    client.chat.completions.create(
      params as Parameters<typeof client.chat.completions.create>[0],
    ) as unknown as ReturnType<ChatCompletionFn>;
}

/** OpenAI Vision を呼び出して構造化出力の JSON 文字列を返す。空応答は AiServiceError。 */
export async function callIdentifyVision(
  complete: ChatCompletionFn,
  prompt: IdentifyPrompt,
  imageUrl: string,
): Promise<string> {
  const res = await complete(buildIdentifyRequest(prompt, imageUrl));
  const content = res.choices[0]?.message?.content;
  if (!content) {
    throw new AiServiceError('empty OpenAI response');
  }
  return content;
}

/**
 * api/_lib/openai.ts 単体テスト (リクエスト構築 + Vision 呼出)
 * SDK は ChatCompletionFn 注入で検証。
 */
import { describe, it, expect, vi } from 'vitest';
import {
  buildIdentifyRequest,
  callIdentifyVision,
  IDENTIFY_MODEL,
  IDENTIFY_MAX_TOKENS,
  type ChatCompletionFn,
} from './openai';
import { AiServiceError } from '../../src/shared/ai/errors';

const prompt = { system: 'sys', user: 'usr' };

describe('buildIdentifyRequest', () => {
  it('model / max_tokens / 画像 detail=low / json_schema を構築する', () => {
    const req = buildIdentifyRequest(prompt, 'https://img.example/x') as {
      model: string;
      max_tokens: number;
      response_format: { type: string };
    };
    expect(req.model).toBe(IDENTIFY_MODEL);
    expect(req.max_tokens).toBe(IDENTIFY_MAX_TOKENS);
    expect(req.response_format.type).toBe('json_schema');
    const json = JSON.stringify(req);
    expect(json).toContain('"url":"https://img.example/x"');
    expect(json).toContain('"detail":"low"');
    expect(json).toContain('sys');
  });
});

describe('callIdentifyVision', () => {
  it('choices[0].message.content を返す', async () => {
    const complete = vi
      .fn<ChatCompletionFn>()
      .mockResolvedValue({ choices: [{ message: { content: '{"common_name":"x"}' } }] });
    const out = await callIdentifyVision(complete, prompt, 'https://img');
    expect(out).toBe('{"common_name":"x"}');
    expect(complete).toHaveBeenCalledOnce();
  });

  it('空応答は AiServiceError', async () => {
    const complete = vi
      .fn<ChatCompletionFn>()
      .mockResolvedValue({ choices: [{ message: { content: null } }] });
    await expect(callIdentifyVision(complete, prompt, 'https://img')).rejects.toBeInstanceOf(
      AiServiceError,
    );
  });
});

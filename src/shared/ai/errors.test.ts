/**
 * errors.ts 単体テスト (公開エラー契約)
 */
import { describe, it, expect } from 'vitest';
import {
  QuotaExceededError,
  AiServiceError,
  SchemaValidationError,
  AfterRetryError,
  RateLimitedError,
} from './errors';

describe('ai errors', () => {
  it('QuotaExceededError', () => {
    const e = new QuotaExceededError();
    expect(e).toBeInstanceOf(Error);
    expect(e.name).toBe('QuotaExceededError');
  });

  it('AiServiceError は cause を保持', () => {
    const cause = new Error('502');
    const e = new AiServiceError('upstream failed', cause);
    expect(e).toBeInstanceOf(Error);
    expect(e.name).toBe('AiServiceError');
    expect(e.cause).toBe(cause);
  });

  it('AiServiceError デフォルトメッセージ', () => {
    expect(new AiServiceError().message).toBe('AI service error');
  });

  it('SchemaValidationError は reason を保持', () => {
    const e = new SchemaValidationError('missing field');
    expect(e.reason).toBe('missing field');
    expect(e.message).toContain('missing field');
  });

  it('AfterRetryError は cause を保持', () => {
    const cause = new Error('500');
    expect(new AfterRetryError('exhausted', cause).cause).toBe(cause);
  });

  it('RateLimitedError は retryAtMs を保持', () => {
    const e = new RateLimitedError(99999);
    expect(e.name).toBe('RateLimitedError');
    expect(e.retryAtMs).toBe(99999);
  });
});

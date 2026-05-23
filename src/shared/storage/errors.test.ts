/**
 * errors.ts 単体テスト (公開エラー契約)
 */
import { describe, it, expect } from 'vitest';
import { InvalidImageError, UploadFailedError, StorageOwnershipError } from './errors';

describe('storage errors', () => {
  it('InvalidImageError は Error 継承 + reason 保持', () => {
    const e = new InvalidImageError('bad mime');
    expect(e).toBeInstanceOf(Error);
    expect(e.name).toBe('InvalidImageError');
    expect(e.reason).toBe('bad mime');
  });

  it('UploadFailedError は cause を保持 (E-ST-001)', () => {
    const cause = new Error('timeout');
    const e = new UploadFailedError('upload failed after retries', cause);
    expect(e).toBeInstanceOf(Error);
    expect(e.name).toBe('UploadFailedError');
    expect(e.cause).toBe(cause);
  });

  it('UploadFailedError はデフォルトメッセージを持つ', () => {
    expect(new UploadFailedError().message).toMatch(/retries/);
  });

  it('StorageOwnershipError は objectKey を保持 (E-ST-005)', () => {
    const e = new StorageOwnershipError('u2/d1/i1.webp');
    expect(e).toBeInstanceOf(Error);
    expect(e.name).toBe('StorageOwnershipError');
    expect(e.objectKey).toBe('u2/d1/i1.webp');
  });
});

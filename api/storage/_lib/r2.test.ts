/**
 * api/storage/_lib/r2.ts 単体テスト (R2 config + PresignClient/MetaClient 配線)
 * SDK (S3Client / getSignedUrl) は注入した fake で検証し、実ネットワークを呼ばない。
 */
import { describe, it, expect, vi } from 'vitest';
import type { S3Client } from '@aws-sdk/client-s3';
import {
  loadR2Config,
  createR2PresignClient,
  createR2MetaClient,
  type SignFn,
} from './r2';

const ENV = {
  R2_ACCOUNT_ID: 'acc123',
  R2_ACCESS_KEY_ID: 'key',
  R2_SECRET_ACCESS_KEY: 'secret',
  R2_BUCKET_NAME: 'plant-images',
} as unknown as NodeJS.ProcessEnv;

function commandInput(command: unknown): Record<string, unknown> {
  return (command as { input: Record<string, unknown> }).input;
}

describe('loadR2Config', () => {
  it('account id から S3 互換 endpoint を組み立てる', () => {
    const cfg = loadR2Config(ENV);
    expect(cfg.endpoint).toBe('https://acc123.r2.cloudflarestorage.com');
    expect(cfg.bucket).toBe('plant-images');
  });

  it('不足キーを列挙して throw する', () => {
    expect(() => loadR2Config({ R2_ACCOUNT_ID: 'a' } as unknown as NodeJS.ProcessEnv)).toThrow(
      /R2_ACCESS_KEY_ID/,
    );
  });
});

describe('createR2PresignClient', () => {
  it('presignPut は PutObject を ttl + contentType 付きで署名する', async () => {
    const sign = vi.fn<SignFn>().mockResolvedValue('https://signed/put');
    const client = {} as S3Client;
    const pc = createR2PresignClient({ client, bucket: 'b', sign });

    const url = await pc.presignPut('u/d/i.webp', 300, 'image/webp');

    expect(url).toBe('https://signed/put');
    const [, command, opts] = sign.mock.calls[0]!;
    expect(opts).toEqual({ expiresIn: 300 });
    expect(commandInput(command)).toMatchObject({
      Bucket: 'b',
      Key: 'u/d/i.webp',
      ContentType: 'image/webp',
    });
  });

  it('presignGet は GetObject を ttl 付きで署名する', async () => {
    const sign = vi.fn<SignFn>().mockResolvedValue('https://signed/get');
    const pc = createR2PresignClient({ client: {} as S3Client, bucket: 'b', sign });

    const url = await pc.presignGet('u/d/i.webp', 3600);

    expect(url).toBe('https://signed/get');
    const [, command, opts] = sign.mock.calls[0]!;
    expect(opts).toEqual({ expiresIn: 3600 });
    expect(commandInput(command)).toMatchObject({ Bucket: 'b', Key: 'u/d/i.webp' });
  });

  it('deleteObject は DeleteObject command を send する', async () => {
    const send = vi.fn().mockResolvedValue({});
    const pc = createR2PresignClient({
      client: { send } as unknown as S3Client,
      bucket: 'b',
      sign: vi.fn<SignFn>(),
    });

    await pc.deleteObject('u/d/i.webp');

    expect(send).toHaveBeenCalledOnce();
    expect(commandInput(send.mock.calls[0]![0])).toMatchObject({ Bucket: 'b', Key: 'u/d/i.webp' });
  });
});

describe('createR2MetaClient', () => {
  it('head は HEAD レスポンスを {size, contentType, uploadedAt} に整形する', async () => {
    const send = vi.fn().mockResolvedValue({
      ContentLength: 123,
      ContentType: 'image/webp',
      LastModified: new Date('2026-01-01T00:00:00Z'),
    });
    const meta = createR2MetaClient({ client: { send } as unknown as S3Client, bucket: 'b' });

    const out = await meta.head('u/d/i.webp');

    expect(out).toEqual({
      size: 123,
      contentType: 'image/webp',
      uploadedAt: '2026-01-01T00:00:00.000Z',
    });
  });

  it('listByPrefix は Contents を StorageObject[] に整形し Key 無しを除外する', async () => {
    const send = vi.fn().mockResolvedValue({
      Contents: [
        { Key: 'u/d/a.webp', Size: 10, LastModified: new Date('2026-01-01T00:00:00Z') },
        { Size: 20 },
      ],
    });
    const meta = createR2MetaClient({ client: { send } as unknown as S3Client, bucket: 'b' });

    const out = await meta.listByPrefix('u/');

    expect(out).toEqual([
      { objectKey: 'u/d/a.webp', size: 10, uploadedAt: '2026-01-01T00:00:00.000Z' },
    ]);
  });
});

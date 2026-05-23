/**
 * presign.ts 単体テスト (orchestration、PresignClient DI)
 * 由来: 003_storage_UNIT_TEST.md §1.2 (U01/U07) + §1.3 (F01〜F04)
 */
import { describe, it, expect, vi } from 'vitest';
import {
  createUploadUrl,
  createSignedUrl,
  createSignedUrls,
  deleteObject,
  UPLOAD_URL_TTL_SEC,
  FETCH_URL_TTL_SEC,
  type PresignClient,
} from './presign';
import { InvalidImageError } from './errors';
import { ValidationError } from '../helpers/url';

function makeClient() {
  const presignPut = vi.fn((key: string) => Promise.resolve(`https://r2.example/put/${key}`));
  const presignGet = vi.fn((key: string) => Promise.resolve(`https://r2.example/get/${key}`));
  const deleteFn = vi.fn(() => Promise.resolve());
  const client: PresignClient = {
    presignPut,
    presignGet,
    deleteObject: deleteFn,
  };
  return { client, presignPut, presignGet, deleteFn };
}

describe('createUploadUrl', () => {
  it('UT-ST-U01: webp 5MB 以下 → presignedUrl + objectKey、PUT 5 分 TTL', async () => {
    const { client, presignPut } = makeClient();
    const res = await createUploadUrl(client, {
      userId: 'u1',
      discoveryId: 'd1',
      imageId: 'i1',
      contentType: 'image/webp',
      sizeBytes: 500_000,
    });
    expect(res.objectKey).toBe('u1/d1/i1.webp');
    expect(res.presignedUrl).toContain('u1/d1/i1.webp');
    expect(presignPut).toHaveBeenCalledWith('u1/d1/i1.webp', UPLOAD_URL_TTL_SEC, 'image/webp');
  });

  it('jpeg → InvalidImageError (presign 呼ばれない)', async () => {
    const { client, presignPut } = makeClient();
    await expect(
      createUploadUrl(client, {
        userId: 'u1',
        discoveryId: 'd1',
        imageId: 'i1',
        contentType: 'image/jpeg',
        sizeBytes: 100,
      }),
    ).rejects.toThrow(InvalidImageError);
    expect(presignPut).not.toHaveBeenCalled();
  });
});

describe('createSignedUrl', () => {
  it('UT-ST-F01: 自分の objectKey → GET URL (60 分 TTL)', async () => {
    const { client, presignGet } = makeClient();
    const url = await createSignedUrl(client, { objectKey: 'u1/d1/i1.webp', userId: 'u1' });
    expect(url).toContain('u1/d1/i1.webp');
    expect(presignGet).toHaveBeenCalledWith('u1/d1/i1.webp', FETCH_URL_TTL_SEC);
  });

  it('UT-ST-F02: expiresIn を上書き', async () => {
    const { client, presignGet } = makeClient();
    await createSignedUrl(client, { objectKey: 'u1/d1/i1.webp', userId: 'u1', expiresIn: 300 });
    expect(presignGet).toHaveBeenCalledWith('u1/d1/i1.webp', 300);
  });

  it('UT-ST-U07: 他 user の objectKey → ValidationError (presign 呼ばれない)', async () => {
    const { client, presignGet } = makeClient();
    await expect(
      createSignedUrl(client, { objectKey: 'u2/d1/i1.webp', userId: 'u1' }),
    ).rejects.toThrow(ValidationError);
    expect(presignGet).not.toHaveBeenCalled();
  });

  it('path traversal → ValidationError', async () => {
    const { client } = makeClient();
    await expect(
      createSignedUrl(client, { objectKey: 'u1/../u2/i1.webp', userId: 'u1' }),
    ).rejects.toThrow(ValidationError);
  });
});

describe('createSignedUrls (batch)', () => {
  it('UT-ST-F03: 10 件 → Record 返却', async () => {
    const { client } = makeClient();
    const keys = Array.from({ length: 10 }, (_, i) => `u1/d1/i${i}.webp`);
    const urls = await createSignedUrls(client, { objectKeys: keys, userId: 'u1' });
    expect(Object.keys(urls)).toHaveLength(10);
    expect(urls['u1/d1/i0.webp']).toContain('u1/d1/i0.webp');
  });

  it('UT-ST-F04: 他 user 混在 → 不正分は除外、正常分は URL', async () => {
    const { client } = makeClient();
    const urls = await createSignedUrls(client, {
      objectKeys: ['u1/d1/a.webp', 'u2/d1/b.webp'],
      userId: 'u1',
    });
    expect(urls['u1/d1/a.webp']).toBeDefined();
    expect(urls['u2/d1/b.webp']).toBeUndefined();
  });

  it('presign 失敗の key は除外', async () => {
    const { client, presignGet } = makeClient();
    presignGet.mockImplementationOnce(() => Promise.reject(new Error('r2 down')));
    const urls = await createSignedUrls(client, {
      objectKeys: ['u1/d1/a.webp', 'u1/d1/b.webp'],
      userId: 'u1',
    });
    // a は失敗、b は成功 (順不同のため合計 1 件)
    expect(Object.keys(urls)).toHaveLength(1);
  });
});

describe('deleteObject', () => {
  it('自分の objectKey → deleteObject 呼出', async () => {
    const { client, deleteFn } = makeClient();
    await deleteObject(client, { objectKey: 'u1/d1/i1.webp', userId: 'u1' });
    expect(deleteFn).toHaveBeenCalledWith('u1/d1/i1.webp');
  });

  it('他 user → ValidationError (delete 呼ばれない)', async () => {
    const { client, deleteFn } = makeClient();
    await expect(
      deleteObject(client, { objectKey: 'u2/d1/i1.webp', userId: 'u1' }),
    ).rejects.toThrow(ValidationError);
    expect(deleteFn).not.toHaveBeenCalled();
  });
});

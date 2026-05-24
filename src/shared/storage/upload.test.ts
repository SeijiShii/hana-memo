/**
 * upload.ts 単体テスト (presigned URL 取得 → 直接 PUT + retry)
 * 由来: 003_storage_UNIT_TEST.md §1.2 (UT-ST-U01〜U07), §1.5 (E01)
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { uploadPlantImage, replacePlantImage, deletePlantImage } from './upload';
import { InvalidImageError, UploadFailedError } from './errors';

function webpBlob(sizeBytes = 1024): Blob {
  return new Blob([new Uint8Array(sizeBytes)], { type: 'image/webp' });
}

function uploadUrlOk(objectKey = 'u/d/i.webp', presignedUrl = 'https://r2.example/put?sig'): Response {
  return new Response(JSON.stringify({ presignedUrl, objectKey }), { status: 200 });
}

const baseOpts = { discoveryId: 'd1', token: 'tok', sleep: async () => {} };

let errorSpy: ReturnType<typeof vi.spyOn>;
beforeEach(() => {
  errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
});
afterEach(() => {
  errorSpy.mockRestore();
});

describe('uploadPlantImage', () => {
  it('UT-ST-U01: WebP <=5MB → presign + PUT → UploadResult', async () => {
    const fetchFn = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(uploadUrlOk('u/d/i.webp'))
      .mockResolvedValueOnce(new Response(null, { status: 200 }));

    const r = await uploadPlantImage(webpBlob(2048), { ...baseOpts, fetchFn });

    expect(r.objectKey).toBe('u/d/i.webp');
    expect(r.size).toBe(2048);
    expect(typeof r.uploadedAt).toBe('string');
    expect(fetchFn).toHaveBeenCalledTimes(2);
    expect(fetchFn.mock.calls[1]![0]).toBe('https://r2.example/put?sig');
    expect((fetchFn.mock.calls[1]![1] as RequestInit).method).toBe('PUT');
  });

  it('UT-ST-U02: contentType=jpeg → InvalidImageError (presign せず)', async () => {
    const fetchFn = vi.fn<typeof fetch>();
    const jpeg = new Blob([new Uint8Array(10)], { type: 'image/jpeg' });
    await expect(uploadPlantImage(jpeg, { ...baseOpts, fetchFn })).rejects.toBeInstanceOf(
      InvalidImageError,
    );
    expect(fetchFn).not.toHaveBeenCalled();
  });

  it('UT-ST-U03: 10MB 超過 → InvalidImageError', async () => {
    const fetchFn = vi.fn<typeof fetch>();
    await expect(
      uploadPlantImage(webpBlob(10 * 1024 * 1024), { ...baseOpts, fetchFn }),
    ).rejects.toBeInstanceOf(InvalidImageError);
    expect(fetchFn).not.toHaveBeenCalled();
  });

  it('UT-ST-U04 / E01: PUT network 失敗 → 2 retry 後 UploadFailedError', async () => {
    const fetchFn = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(uploadUrlOk())
      .mockRejectedValue(new Error('network'));

    await expect(uploadPlantImage(webpBlob(), { ...baseOpts, fetchFn })).rejects.toBeInstanceOf(
      UploadFailedError,
    );
    // 1 (upload-url) + 3 (PUT: initial + 2 retries)
    expect(fetchFn).toHaveBeenCalledTimes(4);
    expect(errorSpy).toHaveBeenCalled();
  });

  it('UT-ST-U07: upload-url 403 (所有者違反/RLS) → UploadFailedError', async () => {
    const fetchFn = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(new Response('forbidden', { status: 403 }));
    await expect(uploadPlantImage(webpBlob(), { ...baseOpts, fetchFn })).rejects.toBeInstanceOf(
      UploadFailedError,
    );
    expect(fetchFn).toHaveBeenCalledTimes(1);
  });

  it('PUT が 5xx を返したら retry し最終的に失敗', async () => {
    const fetchFn = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(uploadUrlOk())
      .mockResolvedValue(new Response('err', { status: 500 }));
    await expect(uploadPlantImage(webpBlob(), { ...baseOpts, fetchFn, maxRetries: 1 })).rejects.toBeInstanceOf(
      UploadFailedError,
    );
    // 1 (upload-url) + 2 (PUT: initial + 1 retry)
    expect(fetchFn).toHaveBeenCalledTimes(3);
  });
});

describe('replacePlantImage', () => {
  it('UT-ST-U05: presign + PUT (upsert) で新 objectKey を返す', async () => {
    const fetchFn = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(uploadUrlOk('u/d/i2.webp'))
      .mockResolvedValueOnce(new Response(null, { status: 200 }));

    const r = await replacePlantImage(webpBlob(), { ...baseOpts, fetchFn });

    expect(r.objectKey).toBe('u/d/i2.webp');
    expect((fetchFn.mock.calls[1]![1] as RequestInit).method).toBe('PUT');
  });
});

describe('deletePlantImage', () => {
  it('UT-ST-U06: POST /api/storage/delete に objectKey を送る', async () => {
    const fetchFn = vi
      .fn<typeof fetch>()
      .mockResolvedValue(new Response(JSON.stringify({ ok: true }), { status: 200 }));

    await deletePlantImage('u/d/i.webp', { token: 'tok', fetchFn });

    expect(fetchFn).toHaveBeenCalledOnce();
    const [url, init] = fetchFn.mock.calls[0]!;
    expect(url).toBe('/api/storage/delete');
    expect((init as RequestInit).method).toBe('POST');
    expect(JSON.parse((init as RequestInit).body as string)).toEqual({ objectKey: 'u/d/i.webp' });
  });

  it('delete 失敗 (403) → UploadFailedError', async () => {
    const fetchFn = vi.fn<typeof fetch>().mockResolvedValue(new Response('no', { status: 403 }));
    await expect(deletePlantImage('u/d/i.webp', { token: 'tok', fetchFn })).rejects.toBeInstanceOf(
      UploadFailedError,
    );
  });
});

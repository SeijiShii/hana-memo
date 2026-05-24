// @vitest-environment happy-dom
/**
 * capture/hooks.ts 単体テスト
 * 由来: docs/capture/003_capture_UNIT_TEST.md §1.1-1.5 (IC / GEO / CF01-03 / IS02-03)
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';

const toWebPMock = vi.fn();
const stripExifMock = vi.fn();
const getCurrentLocationMock = vi.fn();
const uploadPlantImageMock = vi.fn();
const identifyPlantMock = vi.fn();
const createDiscoveryMock = vi.fn();
const attachImageMock = vi.fn();
const deleteDiscoveryMock = vi.fn();
const fetchDiscoveryStatusMock = vi.fn();

vi.mock('../../shared/helpers/image', () => ({
  toWebP: (...a: unknown[]) => toWebPMock(...a),
  stripExif: (...a: unknown[]) => stripExifMock(...a),
}));
vi.mock('../../shared/helpers/location', () => ({
  getCurrentLocation: (...a: unknown[]) => getCurrentLocationMock(...a),
}));
vi.mock('../../shared/storage/upload', () => ({
  uploadPlantImage: (...a: unknown[]) => uploadPlantImageMock(...a),
}));
vi.mock('../../shared/ai/identify', () => ({
  identifyPlant: (...a: unknown[]) => identifyPlantMock(...a),
}));
vi.mock('./captureApi', () => ({
  createDiscovery: (...a: unknown[]) => createDiscoveryMock(...a),
  attachImage: (...a: unknown[]) => attachImageMock(...a),
  deleteDiscovery: (...a: unknown[]) => deleteDiscoveryMock(...a),
  fetchDiscoveryStatus: (...a: unknown[]) => fetchDiscoveryStatusMock(...a),
}));

import { useImageConvert, useGeolocation, useCaptureFlow, useIdentifyStatus } from './hooks';

const blob = new Blob(['x'], { type: 'image/webp' });

beforeEach(() => {
  [
    toWebPMock,
    stripExifMock,
    getCurrentLocationMock,
    uploadPlantImageMock,
    identifyPlantMock,
    createDiscoveryMock,
    attachImageMock,
    deleteDiscoveryMock,
    fetchDiscoveryStatusMock,
  ].forEach((m) => m.mockReset());
});

describe('useImageConvert', () => {
  it('UT-CA-IC: toWebP → stripExif の順で変換', async () => {
    const webp = new Blob(['w'], { type: 'image/webp' });
    const final = new Blob(['f'], { type: 'image/webp' });
    toWebPMock.mockResolvedValue(webp);
    stripExifMock.mockResolvedValue(final);
    const { result } = renderHook(() => useImageConvert());
    let out: Blob | undefined;
    await act(async () => {
      out = await result.current.convert(new File(['raw'], 'raw.jpg', { type: 'image/jpeg' }));
    });
    expect(out).toBe(final);
    expect(toWebPMock).toHaveBeenCalledOnce();
    expect(stripExifMock).toHaveBeenCalledWith(webp);
    expect(result.current.converting).toBe(false);
  });
});

describe('useGeolocation', () => {
  it('request() で現在地を取得', async () => {
    getCurrentLocationMock.mockResolvedValue({ lat: 35, lng: 139 });
    const { result } = renderHook(() => useGeolocation());
    await act(async () => {
      await result.current.request();
    });
    expect(result.current.location).toEqual({ lat: 35, lng: 139 });
  });

  it('拒否時 null', async () => {
    getCurrentLocationMock.mockResolvedValue(null);
    const { result } = renderHook(() => useGeolocation());
    await act(async () => {
      await result.current.request();
    });
    expect(result.current.location).toBeNull();
  });
});

describe('useCaptureFlow', () => {
  const input = { userId: 'u1', capturedAt: '2026-05-24T00:00:00Z', season: 'spring' };

  it('UT-CA-CF01: create→upload→attach→identify の順で実行', async () => {
    const order: string[] = [];
    createDiscoveryMock.mockImplementation(async () => {
      order.push('create');
      return 'd1';
    });
    uploadPlantImageMock.mockImplementation(async () => {
      order.push('upload');
      return { objectKey: 'u1/d1/i1.webp', size: 1, uploadedAt: '' };
    });
    attachImageMock.mockImplementation(async () => {
      order.push('attach');
    });
    identifyPlantMock.mockImplementation(async () => {
      order.push('identify');
      return {};
    });
    const { result } = renderHook(() =>
      useCaptureFlow({ token: 't', isAiConsentActive: () => true, checkQuota: async () => true }),
    );
    let out: { discoveryId: string } | undefined;
    await act(async () => {
      out = await result.current.capture(blob, input);
    });
    expect(out).toEqual({ discoveryId: 'd1' });
    expect(order).toEqual(['create', 'upload', 'attach', 'identify']);
  });

  it('UT-CA-CF02: quota 0 → 例外 + createDiscovery 未呼出', async () => {
    const { result } = renderHook(() =>
      useCaptureFlow({ token: 't', isAiConsentActive: () => true, checkQuota: async () => false }),
    );
    await act(async () => {
      await expect(result.current.capture(blob, input)).rejects.toBeTruthy();
    });
    expect(createDiscoveryMock).not.toHaveBeenCalled();
    expect(result.current.error).toBeInstanceOf(Error);
  });

  it('UT-CA-CF03: upload 失敗 → deleteDiscovery でロールバック', async () => {
    createDiscoveryMock.mockResolvedValue('d1');
    uploadPlantImageMock.mockRejectedValue(new Error('upload boom'));
    deleteDiscoveryMock.mockResolvedValue(undefined);
    const { result } = renderHook(() =>
      useCaptureFlow({ token: 't', isAiConsentActive: () => true, checkQuota: async () => true }),
    );
    await act(async () => {
      await expect(result.current.capture(blob, input)).rejects.toBeTruthy();
    });
    expect(deleteDiscoveryMock).toHaveBeenCalledWith('d1', expect.anything());
    expect(attachImageMock).not.toHaveBeenCalled();
  });
});

describe('useIdentifyStatus', () => {
  const base = { discoveryId: 'd1', commonName: null, scientificName: null, confidence: null };

  it('UT-CA-IS02: terminal になるまで poll する', async () => {
    fetchDiscoveryStatusMock
      .mockResolvedValueOnce({ ...base, status: 'identifying' })
      .mockResolvedValueOnce({ ...base, status: 'identified', commonName: 'タンポポ' });
    const { result } = renderHook(() =>
      useIdentifyStatus('d1', { token: 't', pollIntervalMs: 1, sleep: async () => {} }),
    );
    await waitFor(() => expect(result.current.status).toBe('identified'));
    expect(fetchDiscoveryStatusMock).toHaveBeenCalledTimes(2);
  });

  it('UT-CA-IS03: unmount で poll 停止', async () => {
    let resolveSleep!: () => void;
    const sleep = () => new Promise<void>((r) => (resolveSleep = r));
    fetchDiscoveryStatusMock.mockResolvedValue({ ...base, status: 'identifying' });
    const { unmount } = renderHook(() =>
      useIdentifyStatus('d1', { token: 't', pollIntervalMs: 1, sleep }),
    );
    await waitFor(() => expect(fetchDiscoveryStatusMock).toHaveBeenCalledTimes(1));
    unmount();
    await act(async () => {
      resolveSleep();
      await Promise.resolve();
    });
    expect(fetchDiscoveryStatusMock).toHaveBeenCalledTimes(1); // 停止
  });

  it('discoveryId が null なら fetch しない', async () => {
    renderHook(() => useIdentifyStatus(null, { token: 't' }));
    await Promise.resolve();
    expect(fetchDiscoveryStatusMock).not.toHaveBeenCalled();
  });
});

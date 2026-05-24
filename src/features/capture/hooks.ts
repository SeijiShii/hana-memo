/**
 * 撮影フロー React hooks — 撮影パイプライン core (flow.ts) と各 IO を束ねる。
 *
 * - useImageConvert: canvas WebP 変換 + EXIF strip (helpers/image)
 * - useGeolocation: 位置取得 (helpers/location、拒否時 null)
 * - useCaptureFlow: runCapturePipeline に captureApi + storage upload + identify を注入して実行
 * - useIdentifyStatus: discovery status を poll し識別完了を監視 (Realtime 非対応のため poll、IS02/IS03)
 *
 * 関連: docs/capture/001_capture_SPEC.md §1 UC1, 003_capture_UNIT_TEST.md §1.1-1.5
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { toWebP, stripExif } from '../../shared/helpers/image';
import { getCurrentLocation, type LatLng } from '../../shared/helpers/location';
import { uploadPlantImage } from '../../shared/storage/upload';
import { identifyPlant } from '../../shared/ai/identify';
import type { Season } from '../../shared/types/domain';
import type { DiscoveryStatus } from '../../shared/types/domain';
import { runCapturePipeline, type CaptureDeps, type CapturePipelineInput } from './flow';
import { isTerminalStatus } from './status';
import {
  createDiscovery,
  attachImage,
  deleteDiscovery,
  fetchDiscoveryStatus,
  type CaptureApiOptions,
  type DiscoveryStatusResult,
} from './captureApi';

/** 撮影画像を WebP + EXIF strip に変換する (UT-CA-IC)。 */
export function useImageConvert(): {
  convert: (file: File) => Promise<Blob>;
  converting: boolean;
  error: Error | null;
} {
  const [converting, setConverting] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const convert = useCallback(async (file: File) => {
    setConverting(true);
    setError(null);
    try {
      // canvas 再エンコードで EXIF は落ちるが、明示的に stripExif も通して保証する。
      return await stripExif(await toWebP(file));
    } catch (err) {
      const e = err instanceof Error ? err : new Error(String(err));
      setError(e);
      throw e;
    } finally {
      setConverting(false);
    }
  }, []);
  return { convert, converting, error };
}

/** 現在地を取得する (拒否 / 非対応は null、UT-CA-GEO)。 */
export function useGeolocation(): {
  location: LatLng | null;
  request: () => Promise<LatLng | null>;
  requesting: boolean;
  error: Error | null;
} {
  const [location, setLocation] = useState<LatLng | null>(null);
  const [requesting, setRequesting] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const request = useCallback(async () => {
    setRequesting(true);
    setError(null);
    try {
      const loc = await getCurrentLocation();
      setLocation(loc);
      return loc;
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
      return null;
    } finally {
      setRequesting(false);
    }
  }, []);
  return { location, request, requesting, error };
}

export type CaptureFlowOptions = CaptureApiOptions & {
  /** ai_consent_revoked_at が null か (account.isAiConsentActive 由来)。 */
  isAiConsentActive: () => boolean;
  /** quota 残あり = true。 */
  checkQuota: () => Promise<boolean>;
  /** upload backoff sleep (テスト注入)。 */
  sleep?: (ms: number) => Promise<void>;
};

/** 撮影 → upload → identify 起動までを実行する (UT-CA-CF01〜CF03)。 */
export function useCaptureFlow(opts: CaptureFlowOptions): {
  capture: (
    blob: Blob,
    input: Omit<CapturePipelineInput, 'location'> & { location?: LatLng },
  ) => Promise<{ discoveryId: string }>;
  running: boolean;
  error: Error | null;
} {
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const { token, fetchFn, isAiConsentActive, checkQuota, sleep } = opts;

  const capture = useCallback(
    async (blob: Blob, input: Omit<CapturePipelineInput, 'location'> & { location?: LatLng }) => {
      setRunning(true);
      setError(null);
      const api: CaptureApiOptions = { token, fetchFn };
      let objectKey = '';
      const deps: CaptureDeps = {
        isAiConsentActive,
        checkQuota,
        createDiscovery: (i) =>
          createDiscovery(
            {
              capturedAt: i.capturedAt,
              season: i.season,
              location: i.location,
              userNote: i.userNote,
            },
            api,
          ),
        uploadImage: async (discoveryId) => {
          const r = await uploadPlantImage(blob, { discoveryId, token, fetchFn, sleep });
          objectKey = r.objectKey;
          return { objectKey: r.objectKey };
        },
        attachImage: (discoveryId, key) => attachImage(discoveryId, key, blob.size, api),
        triggerIdentify: (discoveryId) =>
          identifyPlant(
            {
              discoveryId,
              imageObjectKey: objectKey,
              capturedAt: input.capturedAt,
              season: input.season as Season,
              location: input.location,
              userNote: input.userNote,
            },
            { token, fetchFn },
          ).then(() => undefined),
        deleteDiscovery: (discoveryId) => deleteDiscovery(discoveryId, api),
      };
      try {
        return await runCapturePipeline(deps, { ...input });
      } catch (err) {
        setError(err instanceof Error ? err : new Error(String(err)));
        throw err;
      } finally {
        setRunning(false);
      }
    },
    [token, fetchFn, isAiConsentActive, checkQuota, sleep],
  );

  return { capture, running, error };
}

export type IdentifyStatusOptions = CaptureApiOptions & {
  /** poll 間隔 (既定 5000ms、UT-CA-IS02)。 */
  pollIntervalMs?: number;
  /** sleep 注入 (テスト用)。 */
  sleep?: (ms: number) => Promise<void>;
  /** ステータス更新の都度発火 (UT-CA-IS01 相当)。 */
  onUpdate?: (result: DiscoveryStatusResult) => void;
};

/** discovery のステータスを terminal になるまで poll する (UT-CA-IS02/IS03)。 */
export function useIdentifyStatus(
  discoveryId: string | null,
  opts: IdentifyStatusOptions,
): { status: DiscoveryStatus | null; result: DiscoveryStatusResult | null; error: Error | null } {
  const [result, setResult] = useState<DiscoveryStatusResult | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const { token, fetchFn, pollIntervalMs, sleep, onUpdate } = opts;
  // fetchFn / sleep / onUpdate を ref 化して effect 依存から外す。caller が inline 関数を渡しても
  // setResult による再 render で poll loop が再起動して暴走するのを防ぐ (effect は安定値のみ依存)。
  const fetchFnRef = useRef(fetchFn);
  fetchFnRef.current = fetchFn;
  const sleepRef = useRef(sleep);
  sleepRef.current = sleep;
  const onUpdateRef = useRef(onUpdate);
  onUpdateRef.current = onUpdate;

  useEffect(() => {
    if (!discoveryId) {
      return;
    }
    let active = true;
    const doSleep =
      sleepRef.current ?? ((ms: number) => new Promise<void>((r) => setTimeout(r, ms)));
    const interval = pollIntervalMs ?? 5000;

    (async () => {
      for (;;) {
        if (!active) return;
        try {
          const r = await fetchDiscoveryStatus(discoveryId, { token, fetchFn: fetchFnRef.current });
          if (!active) return;
          setResult(r);
          setError(null);
          onUpdateRef.current?.(r);
          if (isTerminalStatus(r.status)) {
            return;
          }
        } catch (err) {
          if (!active) return;
          setError(err instanceof Error ? err : new Error(String(err)));
        }
        await doSleep(interval);
      }
    })();

    return () => {
      active = false; // UT-CA-IS03 unmount で poll 停止
    };
  }, [discoveryId, token, pollIntervalMs]);

  return { status: result?.status ?? null, result, error };
}

/**
 * 撮影 UI — **インラインカメラ** (getUserMedia) で 1 枚の画像を取得する。
 *
 * 背景 (fix: モバイル OOM): 以前は `<input type="file" capture>` でネイティブカメラアプリを起動していたが、
 * 一部のスマホ (特にメモリの厳しい端末) ではカメラアプリ往復中に WebView がメモリ退避→破棄され、
 * アプリに戻ると「メモリ不足で実行できない」になった。**ページ内のインラインカメラ** (live video +
 * canvas キャプチャ) ならアプリ切り替えが起きず退避されない。getUserMedia は secure context (HTTPS /
 * localhost) 必須 — 本番 HTTPS では動作。非対応・不許可・非 secure の端末は file 選択に fallback する。
 *
 * 取得画像は onCapture(File) で上位 (useImageConvert → useCaptureFlow) に渡す (インターフェース不変)。
 *
 * 関連: docs/capture/001_capture_SPEC.md §1 UC1, docs/capture/fix_001_* (mobile camera OOM)
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { Camera, ImagePlus, X } from 'lucide-react';
import { cn } from '../../lib/utils';

export type CameraCaptureProps = {
  /** 画像が取得されたとき発火。 */
  onCapture: (file: File) => void;
  /** 撮影フロー実行中などで無効化する。 */
  disabled?: boolean;
};

type Mode = 'idle' | 'starting' | 'live' | 'error';

/** インラインカメラ (getUserMedia) が使えるか。secure context + API 有無で判定。 */
function supportsInlineCamera(): boolean {
  return (
    typeof navigator !== 'undefined' &&
    typeof navigator.mediaDevices !== 'undefined' &&
    typeof navigator.mediaDevices.getUserMedia === 'function'
  );
}

export function CameraCapture({ onCapture, disabled }: CameraCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [mode, setMode] = useState<Mode>('idle');
  const inlineOk = supportsInlineCamera();

  const stopStream = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }, []);

  // アンマウント時に必ずカメラを解放 (退避・リーク防止)。
  useEffect(() => () => stopStream(), [stopStream]);

  // live になったら video に stream を接続して再生 (iOS は playsInline + muted 必須)。
  useEffect(() => {
    if (mode === 'live' && videoRef.current && streamRef.current) {
      try {
        videoRef.current.srcObject = streamRef.current;
        const playResult = videoRef.current.play?.();
        if (playResult && typeof playResult.catch === 'function') {
          playResult.catch(() => undefined);
        }
      } catch {
        // srcObject/play 非対応環境では preview 接続をスキップ (撮影 UI は維持)。
      }
    }
  }, [mode]);

  const startCamera = async () => {
    setMode('starting');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' } },
        audio: false,
      });
      streamRef.current = stream;
      setMode('live');
    } catch {
      stopStream();
      setMode('error');
    }
  };

  const cancelCamera = () => {
    stopStream();
    setMode('idle');
  };

  const shoot = () => {
    const video = videoRef.current;
    const w = video?.videoWidth ?? 0;
    const h = video?.videoHeight ?? 0;
    if (!video || !w || !h) return;
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, w, h);
    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        const file = new File([blob], `capture-${Date.now()}.jpg`, { type: 'image/jpeg' });
        stopStream();
        setMode('idle');
        onCapture(file);
      },
      'image/jpeg',
      0.9,
    );
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onCapture(file);
    }
  };

  // --- live: ページ内カメラプレビュー + シャッター ---
  if (mode === 'live') {
    return (
      <div className="flex w-full flex-col items-center gap-3">
        <div className="relative w-full max-w-sm overflow-hidden rounded-2xl bg-black">
          <video
            ref={videoRef}
            playsInline
            muted
            autoPlay
            aria-label="カメラプレビュー"
            className="h-auto w-full"
          />
          <button
            type="button"
            onClick={cancelCamera}
            aria-label="カメラを閉じる"
            className="absolute right-2 top-2 rounded-full bg-black/50 p-2 text-white"
          >
            <X size={18} aria-hidden />
          </button>
        </div>
        <button
          type="button"
          onClick={shoot}
          disabled={disabled}
          className={cn('btn-primary', disabled && 'pointer-events-none opacity-50')}
        >
          <Camera size={18} aria-hidden />
          この植物を撮る
        </button>
      </div>
    );
  }

  // --- idle / starting / error: 起動ボタン + ファイル選択 fallback ---
  return (
    <div className="flex flex-col items-center gap-2">
      {inlineOk ? (
        <button
          type="button"
          onClick={startCamera}
          disabled={disabled || mode === 'starting'}
          aria-label="カメラを起動して撮影"
          className={cn(
            'btn-primary',
            (disabled || mode === 'starting') && 'pointer-events-none opacity-50',
          )}
        >
          <Camera size={18} aria-hidden />
          {mode === 'starting' ? 'カメラを起動中…' : '撮影する'}
        </button>
      ) : null}

      {/* ファイル選択 (fallback / 代替): カメラ非対応・不許可・端末で写真から選ぶ */}
      <label
        className={cn(
          inlineOk
            ? 'text-sm text-ink-soft underline cursor-pointer'
            : 'btn-primary cursor-pointer',
          disabled && 'pointer-events-none opacity-50',
        )}
      >
        {inlineOk ? null : <ImagePlus size={18} aria-hidden />}
        {inlineOk ? '写真を選ぶ' : '写真を選ぶ'}
        <input
          type="file"
          accept="image/*"
          aria-label="植物を撮影 / 画像を選択"
          disabled={disabled}
          onChange={handleFileChange}
          className="sr-only"
        />
      </label>

      {mode === 'error' ? (
        <p role="alert" className="text-xs text-red-500">
          カメラを起動できませんでした。許可を確認するか、写真を選んでください。
        </p>
      ) : !inlineOk ? (
        <p className="text-xs text-ink-faint">
          カメラが利用できない端末では、フォルダから写真を選べます。
        </p>
      ) : null}
    </div>
  );
}

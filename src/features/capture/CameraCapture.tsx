/**
 * 撮影 UI — カメラ起動 or フォルダ選択で 1 枚の画像を取得する。
 *
 * `<input type="file" accept="image/*" capture="environment">` を基本とし、モバイルではカメラが
 * 直接起動する。`navigator.mediaDevices` 非対応環境ではフォルダ選択 fallback を明示する (UT-CA-E01)。
 * ネイティブ input は視覚的に隠し、デザインシステム準拠の「撮影する」ボタン (label) で起動する
 * (生の file input chrome / 「選択されていません」を見せない、design-system.md / O39)。
 * 選択された File は onCapture で上位 (useImageConvert → useCaptureFlow) に渡す。
 *
 * 関連: docs/capture/001_capture_SPEC.md §1 UC1, 003_capture_UNIT_TEST.md §1.8 (UT-CA-E01)
 */
import { useRef } from 'react';
import { Camera, ImagePlus } from 'lucide-react';
import { cn } from '../../lib/utils';

export type CameraCaptureProps = {
  /** 画像が選択されたとき発火。 */
  onCapture: (file: File) => void;
  /** 撮影フロー実行中などで無効化する。 */
  disabled?: boolean;
};

/** カメラ対応有無を判定する (内部ヘルパ)。 */
function supportsCamera(): boolean {
  return typeof navigator !== 'undefined' && Boolean(navigator.mediaDevices);
}

/** 撮影 / 画像選択ボタン。ネイティブ input は隠し、styled label で起動する。 */
export function CameraCapture({ onCapture, disabled }: CameraCaptureProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const cameraReady = supportsCamera();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onCapture(file);
    }
  };

  return (
    <div className="flex flex-col items-center gap-2">
      <label
        className={cn('btn-primary cursor-pointer', disabled && 'pointer-events-none opacity-50')}
      >
        {cameraReady ? <Camera size={18} aria-hidden /> : <ImagePlus size={18} aria-hidden />}
        {cameraReady ? '撮影する' : '写真を選ぶ'}
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          capture="environment"
          aria-label="植物を撮影 / 画像を選択"
          disabled={disabled}
          onChange={handleChange}
          className="sr-only"
        />
      </label>
      {!cameraReady ? (
        <p className="text-xs text-ink-faint">
          カメラが利用できない端末では、フォルダから写真を選べます。
        </p>
      ) : null}
    </div>
  );
}

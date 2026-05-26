/**
 * 撮影トリガーボタン — 撮影前に quota を事前 check し、超過時は QuotaModal を開く。
 *
 * quota の取得元はアプリ層 (billing useAiCredits / auth trial) によって決まるため、本コンポーネントは
 * テスト容易性のため quota 状態を props で受け取る (PLAN §1 の useQuota 相当を呼び出し側で配線)。
 * - quotaRemaining <= 0 → QuotaModal を表示し、撮影を開始せず購入導線へ (E-CA-004、revise_001)
 * - それ以外 → CameraCapture を表示し、撮影で onCapture を発火
 *
 * 関連: docs/capture/001_capture_SPEC.md §1 UC1 代替フロー / §4.2 E-CA-004,
 *       docs/capture/002_capture_PLAN.md §1 (components/CaptureButton.tsx)
 */
import { useState } from 'react';
import { Camera } from 'lucide-react';
import { CameraCapture } from '../CameraCapture';
import { QuotaModal } from './QuotaModal';

export type CaptureButtonProps = {
  /** 残 quota (AI クレジット)。0 以下で課金誘導。 */
  quotaRemaining: number;
  /** 撮影画像が得られたとき発火 (上位で convert → flow に渡す)。 */
  onCapture: (file: File) => void;
  /** 撮影フロー実行中などで無効化する。 */
  disabled?: boolean;
};

/** 撮影ボタン。quota 超過時は撮影せず QuotaModal (購入導線) を開く。 */
export function CaptureButton({ quotaRemaining, onCapture, disabled }: CaptureButtonProps) {
  const [modalOpen, setModalOpen] = useState(false);
  const blocked = quotaRemaining <= 0;

  if (blocked) {
    return (
      <>
        <button
          type="button"
          disabled={disabled}
          onClick={() => setModalOpen(true)}
          className="btn-primary"
        >
          <Camera size={18} aria-hidden />
          撮影する
        </button>
        <QuotaModal open={modalOpen} onClose={() => setModalOpen(false)} />
      </>
    );
  }

  return <CameraCapture onCapture={onCapture} disabled={disabled} />;
}

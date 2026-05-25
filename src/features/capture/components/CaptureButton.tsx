/**
 * 撮影トリガーボタン — 撮影前に quota を事前 check し、超過時は QuotaModal を開く。
 *
 * quota の取得元はアプリ層 (billing useAiCredits / auth trial) によって決まるため、本コンポーネントは
 * テスト容易性のため quota 状態を props で受け取る (PLAN §1 の useQuota 相当を呼び出し側で配線)。
 * - quotaRemaining <= 0      → QuotaModal(reason='quota') を表示し、撮影を開始しない (E-CA-004)
 * - linkRequired (匿名 trial 超過) → QuotaModal(reason='link_required') を表示 (E-CA-005)
 * - それ以外 → CameraCapture を表示し、撮影で onCapture を発火
 *
 * 関連: docs/capture/001_capture_SPEC.md §1 UC1 代替フロー / §4.2 E-CA-004/005,
 *       docs/capture/002_capture_PLAN.md §1 (components/CaptureButton.tsx)
 */
import { useState } from 'react';
import { Camera } from 'lucide-react';
import { CameraCapture } from '../CameraCapture';
import { QuotaModal } from './QuotaModal';

export type CaptureButtonProps = {
  /** 残 quota (AI クレジット)。0 以下で課金誘導。 */
  quotaRemaining: number;
  /** 匿名 trial 超過で OAuth 連携が必要なとき true。 */
  linkRequired?: boolean;
  /** 撮影画像が得られたとき発火 (上位で convert → flow に渡す)。 */
  onCapture: (file: File) => void;
  /** 撮影フロー実行中などで無効化する。 */
  disabled?: boolean;
};

/** 撮影ボタン。quota 超過 / link_required 時は撮影せず QuotaModal を開く。 */
export function CaptureButton({
  quotaRemaining,
  linkRequired,
  onCapture,
  disabled,
}: CaptureButtonProps) {
  const [modalOpen, setModalOpen] = useState(false);
  const blocked = linkRequired || quotaRemaining <= 0;
  const reason: 'quota' | 'link_required' = linkRequired ? 'link_required' : 'quota';

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
        <QuotaModal open={modalOpen} reason={reason} onClose={() => setModalOpen(false)} />
      </>
    );
  }

  return <CameraCapture onCapture={onCapture} disabled={disabled} />;
}

/**
 * quota 超過モーダル — 撮影前 check で残回数 0 になったとき、クレジット購入へ誘導する。
 *
 * revise_001: 匿名 user も購入クレジットを使えるため、枯渇時は連携ではなく購入導線に一本化する
 * (旧 reason='link_required' / OAuth 誘導は廃止)。navigate('/billing') で購入画面へ (E-CA-004)。
 *
 * 関連: docs/capture/001_capture_SPEC.md §1 UC1 代替フロー / §4.2 E-CA-004,
 *       docs/capture/002_capture_PLAN.md §1 (components/QuotaModal.tsx)
 */
import { useNavigate } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';

const COPY = {
  title: '無料の識別回数を使い切りました',
  body: '¥100 で 10 回ぶん追加できます。続けて植物を調べられます。',
  cta: 'クレジットを追加',
  to: '/billing',
} as const;

export type QuotaModalProps = {
  /** true で表示する。false のとき何も描画しない。 */
  open: boolean;
  /** 閉じる操作 (背景 / 「あとで」)。 */
  onClose: () => void;
};

/** quota 0 の購入誘導モーダル。open=false のとき何も描画しない。 */
export function QuotaModal({ open, onClose }: QuotaModalProps) {
  const navigate = useNavigate();
  if (!open) {
    return null;
  }
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={COPY.title}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
    >
      <div className="w-full max-w-sm rounded-card bg-surface p-6 shadow-lift">
        <h2 className="text-lg font-bold text-ink">{COPY.title}</h2>
        <p className="mt-2 text-sm text-ink-soft">{COPY.body}</p>
        <div className="mt-5 flex flex-col gap-2">
          <button type="button" onClick={() => navigate(COPY.to)} className="btn-primary">
            {COPY.cta}
            <ArrowRight size={18} aria-hidden />
          </button>
          <button
            type="button"
            onClick={onClose}
            className="rounded-pill px-4 py-2 text-sm text-ink-faint hover:bg-surface-soft"
          >
            あとで
          </button>
        </div>
      </div>
    </div>
  );
}

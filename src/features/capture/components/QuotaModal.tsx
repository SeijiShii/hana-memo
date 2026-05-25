/**
 * quota 超過 / link_required モーダル — 撮影前 check で撮影不可となった理由ごとに誘導先を出し分ける。
 *
 * - reason='quota'         → 「課金画面へ」 navigate('/billing') (E-CA-004)
 * - reason='link_required' → 「アカウント連携へ」 navigate('/billing') で OAuth 誘導 (E-CA-005)
 *   ※ 連携導線は billing 画面の OAuthRequiredModal に集約されているため、いずれも /billing に誘導する。
 *
 * 関連: docs/capture/001_capture_SPEC.md §1 UC1 代替フロー / §4.2 E-CA-004/005,
 *       docs/capture/002_capture_PLAN.md §1 (components/QuotaModal.tsx)
 */
import { useNavigate } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';

export type QuotaModalReason = 'quota' | 'link_required';

export type QuotaModalProps = {
  /** true で表示する。false のとき何も描画しない。 */
  open: boolean;
  /** 表示理由。メッセージ・CTA を出し分ける。 */
  reason: QuotaModalReason;
  /** 閉じる操作 (背景 / 「あとで」)。 */
  onClose: () => void;
};

const COPY: Record<QuotaModalReason, { title: string; body: string; cta: string; to: string }> = {
  quota: {
    title: '今月の識別回数を使い切りました',
    body: 'AI 識別の残り回数がありません。クレジットを追加すると引き続き識別できます。',
    cta: '課金画面へ',
    to: '/billing',
  },
  link_required: {
    title: 'アカウント連携が必要です',
    body: 'お試し回数を使い切りました。Google アカウントを連携すると引き続き識別できます。',
    cta: 'アカウント連携へ',
    to: '/billing',
  },
};

/** quota 0 / link_required の誘導モーダル。open=false のとき何も描画しない。 */
export function QuotaModal({ open, reason, onClose }: QuotaModalProps) {
  const navigate = useNavigate();
  if (!open) {
    return null;
  }
  const copy = COPY[reason];
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={copy.title}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
    >
      <div className="w-full max-w-sm rounded-card bg-surface p-6 shadow-lift">
        <h2 className="text-lg font-bold text-ink">{copy.title}</h2>
        <p className="mt-2 text-sm text-ink-soft">{copy.body}</p>
        <div className="mt-5 flex flex-col gap-2">
          <button type="button" onClick={() => navigate(copy.to)} className="btn-primary">
            {copy.cta}
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

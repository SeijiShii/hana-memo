/**
 * アカウント連携モーダル — 匿名 (Guest) user に Google 連携を促す。
 *
 * 用途は「端末間でのデータ引き継ぎ」(Settings の連携 CTA / アカウント削除前の本人確認)。
 * 購入は revise_001 でゲストのまま連携不要になったため、本モーダルは課金パスからは使われない。
 * 「連携する」押下で onLink を呼ぶ (実体は呼び出し側が _shared/auth.linkGoogleIdentity を渡す)。
 *
 * 関連: docs/account/001_account_SPEC.md (連携 CTA), docs/billing/revise_001_* (購入の連携必須撤廃)
 */
import { Link2 } from 'lucide-react';

export type OAuthRequiredModalProps = {
  /** 匿名 user のとき true で表示する。 */
  open: boolean;
  /** 「連携する」押下時 (_shared/auth.linkGoogleIdentity を配線)。 */
  onLink: () => void;
  /** 「あとで」押下 / 背景クリックで閉じる。 */
  onClose?: () => void;
};

/** 匿名 user 向け OAuth 連携モーダル。open=false のとき何も描画しない。 */
export function OAuthRequiredModal({ open, onLink, onClose }: OAuthRequiredModalProps) {
  if (!open) {
    return null;
  }
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="アカウントを連携する"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
    >
      <div className="w-full max-w-sm rounded-card bg-surface p-6 shadow-lift">
        <h2 className="text-lg font-bold text-ink">アカウントを連携する</h2>
        <p className="mt-2 text-sm text-ink-soft">
          Google アカウントと連携すると、別の端末でも同じ発見ノートを使えます。
        </p>
        <div className="mt-5 flex flex-col gap-2">
          <button type="button" onClick={onLink} className="btn-primary">
            <Link2 size={18} aria-hidden />
            連携する
          </button>
          {onClose ? (
            <button
              type="button"
              onClick={onClose}
              className="rounded-pill px-4 py-2 text-sm text-ink-faint hover:bg-surface-soft"
            >
              あとで
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}

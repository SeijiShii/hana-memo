/**
 * OAuth リンク必須モーダル — 匿名 (Guest) user が課金画面に入った際に Google 連携を促す。
 *
 * 購入には OAuth リンクが必須 (E-BL-002)。「連携する」押下で onLink を呼ぶ (実体は呼び出し側が
 * _shared/auth.linkGoogleIdentity を渡す)。
 *
 * 関連: docs/billing/001_billing_SPEC.md §1 UC4, 002_billing_PLAN.md Phase 3 (UT-BL-OM01/OM02)
 */

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
      aria-label="アカウント連携が必要です"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
    >
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
        <h2 className="text-lg font-bold text-neutral-800">アカウント連携が必要です</h2>
        <p className="mt-2 text-sm text-neutral-600">
          購入には Google アカウントの連携が必要です。連携すると購入履歴やクレジットが引き継がれます。
        </p>
        <div className="mt-5 flex flex-col gap-2">
          <button
            type="button"
            onClick={onLink}
            className="rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700"
          >
            連携する
          </button>
          {onClose ? (
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg px-4 py-2 text-sm text-neutral-500 hover:bg-neutral-100"
            >
              あとで
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}

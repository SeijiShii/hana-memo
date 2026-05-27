/**
 * 課金 container — 実 hook (useBillingStatus) + createCheckout を BillingPage に配線する。
 *
 * 配線:
 *   - useBillingStatus({ token }) → status / loading / error
 *   - onCheckout(input): createCheckout(input, { token }) で Stripe Checkout URL を取得し、
 *     location.assign(url) で Stripe へリダイレクトする (実リダイレクトは container 内に閉じ込める)。
 *
 * revise_001: 匿名でも購入可となったため OAuth リンク必須ゲート (旧 isLinked/onLink) は撤廃。
 *
 * token=null (未 sign-in / keyless) の間は status 取得をスキップし、購入導線も no-op にする。
 *
 * リダイレクト副作用 (location.assign) はテストで window.location をモックして検証する。
 *
 * 関連: src/features/billing/pages/BillingPage.tsx, src/features/billing/hooks.ts,
 *       src/features/billing/api.ts (createCheckout)
 */
import { useState } from 'react';
import { BillingPage } from './pages/BillingPage';
import { useBillingStatus } from './hooks';
import { createCheckout, type CheckoutInput } from './api';
import { useAuthToken } from '../../app/useAuthToken';

export type BillingContainerProps = {
  /** テスト用にトークンを明示注入する (省略時は useAuthToken)。 */
  token?: string | null;
  /** テスト用に Stripe リダイレクトを差し替える (省略時は window.location.assign)。 */
  redirect?: (url: string) => void;
};

function defaultRedirect(url: string): void {
  if (typeof window !== 'undefined') {
    window.location.assign(url);
  }
}

/** token がある場合に useBillingStatus を起動する内部 container。 */
function AuthedBilling({ token, redirect }: { token: string; redirect: (url: string) => void }) {
  const { status, loading, error } = useBillingStatus({ token });
  const [checkoutPending, setCheckoutPending] = useState(false);
  const [checkoutError, setCheckoutError] = useState<Error | null>(null);

  const onCheckout = async (input: CheckoutInput) => {
    setCheckoutPending(true);
    setCheckoutError(null);
    try {
      const { url } = await createCheckout(input, { token });
      redirect(url); // Stripe Checkout へ遷移 (実副作用は container 内に閉じ込める)。
    } catch (err) {
      setCheckoutError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setCheckoutPending(false);
    }
  };

  return (
    <BillingPage
      status={status}
      statusLoading={loading}
      statusError={error}
      onCheckout={onCheckout}
      checkoutPending={checkoutPending}
      checkoutError={checkoutError}
    />
  );
}

/**
 * 課金 container。token 未解決 / 未 sign-in は購入導線を持たない BillingPage を描画する。
 */
export function BillingContainer({
  token: injectedToken,
  redirect = defaultRedirect,
}: BillingContainerProps = {}) {
  const auth = useAuthToken();
  const token = injectedToken !== undefined ? injectedToken : auth.token;

  if (!token) {
    // 未 sign-in / token 未解決: 購入を起動しない no-op onCheckout を渡す。
    return <BillingPage onCheckout={() => undefined} />;
  }
  return <AuthedBilling token={token} redirect={redirect} />;
}

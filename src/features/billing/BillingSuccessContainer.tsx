/**
 * 決済完了戻り container — confirmCheckout を BillingSuccessPage.onConfirm に配線する。
 *
 * onConfirm(sessionId): confirmCheckout(sessionId, { token }) を呼び、Webhook 反映を poll する。
 * token=null (未 sign-in / keyless) の間は onConfirm を渡さず「処理中です」表示にフォールバックさせる
 * (BillingSuccessPage は onConfirm 未指定なら pending 表示する)。
 *
 * 関連: src/features/billing/pages/BillingSuccessPage.tsx, src/features/billing/api.ts (confirmCheckout)
 */
import { BillingSuccessPage } from './pages/BillingSuccessPage';
import { confirmCheckout } from './api';
import { useAuthToken } from '../../app/useAuthToken';

export type BillingSuccessContainerProps = {
  /** テスト用にトークンを明示注入する (省略時は useAuthToken)。 */
  token?: string | null;
};

/** 決済完了戻り container。token 確定後に confirmCheckout を poll seam として注入する。 */
export function BillingSuccessContainer({
  token: injectedToken,
}: BillingSuccessContainerProps = {}) {
  const auth = useAuthToken();
  const token = injectedToken !== undefined ? injectedToken : auth.token;

  if (!token) {
    return <BillingSuccessPage />;
  }
  return (
    <BillingSuccessPage
      onConfirm={(sessionId) => confirmCheckout(sessionId, { token })}
    />
  );
}

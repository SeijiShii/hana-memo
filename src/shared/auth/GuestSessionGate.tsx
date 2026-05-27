/**
 * 起動時匿名サインインの駆動コンポーネント (revise_001)。
 *
 * `useGuestSession` を呼ぶだけの無描画ゲート。**ClerkProvider 内 (= キーあり時) に置く**こと。
 * デバイス fingerprint は spam-guard の `getFingerprint` を注入する (匿名 user 量産抑止)。
 * 匿名 session 確立に最終的に失敗した場合のみ、fatal 通知を描画する (E-AU-001)。
 *
 * 関連: src/shared/auth/useGuestSession.ts, src/app/AppAuthProvider.tsx,
 *       docs/_shared/auth/001_auth_SPEC.md §4.2 (E-AU-001)
 */
import { useGuestSession } from './useGuestSession';
import { getFingerprint } from './spam-guard';

export function GuestSessionGate() {
  const { status } = useGuestSession({ getFingerprint: () => getFingerprint() });

  if (status === 'error') {
    return (
      <div
        role="alert"
        aria-label="起動エラー"
        className="fixed inset-x-0 top-0 z-[70] bg-rose-100 px-3 py-2 text-center text-sm text-rose-800"
      >
        アプリを起動できませんでした。通信環境を確認して再読み込みしてください。
      </div>
    );
  }
  return null;
}

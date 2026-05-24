/**
 * app 層 認証プロバイダ — VITE_CLERK_PUBLISHABLE_KEY の有無で挙動を分岐する。
 *
 * - キーあり: 既存の厳格な `AuthProvider` (Clerk ClerkProvider wrapper) をマウントする。
 * - キーなし (キーレス dev / テスト): クラッシュさせず children を素通しする。開発者向けに
 *   小さな注意バナーを画面下部に出す (本番では Vercel env にキーが設定される前提)。
 *
 * 設計判断: 既存 `src/shared/auth/provider.tsx` の `AuthProvider` は「キー未設定なら throw」する
 * 仕様 (provider.test.tsx が throw を期待) のため挙動を変えない。代わりに app 層に本 wrapper を
 * 置き、キー欠如時のグレースフルな分岐を担わせる (キーレス起動・happy-dom テストでツリー全体が
 * ハードフェイルしないようにする要件 #1 を満たす)。
 *
 * 関連: src/shared/auth/provider.tsx, docs/_shared/auth/001_auth_SPEC.md §1.1
 */
import type { ReactNode } from 'react';
import { AuthProvider } from '../shared/auth/provider';
import { ClerkAuthBridge } from '../shared/auth/ClerkAuthBridge';

/** frontend 公開可能キー。未設定なら keyless モードで children を素通しする。 */
const PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY as string | undefined;

export type AppAuthProviderProps = {
  children: ReactNode;
  /** テスト用にキーを明示注入する (省略時は VITE_ 環境変数)。 */
  publishableKey?: string;
};

/**
 * Clerk キーがあれば AuthProvider でラップ、無ければ children をそのまま描画する。
 * 後者は keyless dev / テストでツリーをクラッシュさせないための fallback。
 */
export function AppAuthProvider({ children, publishableKey }: AppAuthProviderProps) {
  const key = publishableKey ?? PUBLISHABLE_KEY;
  if (!key) {
    // キーレス起動: 認証コンテキストなしで children を描画する (要件 #1: graceful degradation)。
    return (
      <>
        {children}
        <div
          role="note"
          aria-label="認証未設定の通知"
          // pointer-events-none: 情報バナーが下部ナビ等の操作を遮らないようにする (クリック透過)。
          className="pointer-events-none fixed bottom-0 left-0 right-0 z-[60] bg-amber-100 px-3 py-1.5 text-center text-xs text-amber-800"
        >
          認証キー (VITE_CLERK_PUBLISHABLE_KEY) が未設定です。ログイン機能は無効化されています。
        </div>
      </>
    );
  }
  // キーあり: ClerkProvider 内に bridge を挿し、Clerk → AuthSnapshot を context へ供給する。
  return (
    <AuthProvider publishableKey={key}>
      <ClerkAuthBridge>{children}</ClerkAuthBridge>
    </AuthProvider>
  );
}

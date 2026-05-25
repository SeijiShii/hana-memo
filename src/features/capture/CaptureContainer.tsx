/**
 * 撮影画面 container — billing / auth 由来の quota・連携状態を CapturePage に配線する。
 *
 * 配線済み (実データ、fix_001):
 *   - quotaRemaining: useIdentifyQuota({ token }).remaining (実効残数 = 匿名 trial / 登録 月次+credits)。
 *     token 未解決 / 未取得 (null) は既定 (十分量) とみなす。ai_credits 単独だと新規匿名が trial 枠で
 *     撮影できず即ブロックされる (claim_001) ため、実効 quota を使う。
 *   - linkRequired: server 算出の mustLink (匿名が trial 使い切り)。
 *
 * seam (未配線):
 *   - aiConsentActive: user_settings (ai_consent_revoked_at) 取得 Function が未実装のため既定 true。
 *     設定取得 API 配線後 (Milestone C) に isAiConsentActive を流し込む。
 *
 * 関連: src/features/capture/pages/CapturePage.tsx, src/features/billing/hooks.ts (useIdentifyQuota),
 *       src/shared/auth/hooks.ts
 */
import { CapturePage } from './pages/CapturePage';
import { useIdentifyQuota } from '../billing';
import { useAuthToken } from '../../app/useAuthToken';

export type CaptureContainerProps = {
  /** テスト用にトークンを明示注入する (省略時は useAuthToken)。 */
  token?: string | null;
};

/** token がある場合に useIdentifyQuota を起動する内部 container。 */
function AuthedCapture({ token }: { token: string }) {
  const { remaining, mustLink } = useIdentifyQuota({ token });
  // 実効残数が取れていればそれを quota とする。未取得 (null) は十分量とみなす (CapturePage 既定)。
  const quotaRemaining = remaining ?? Number.POSITIVE_INFINITY;
  // 匿名が trial 使い切り → 連携必須 (server の effectiveQuota が算出した mustLink)。
  const linkRequired = mustLink;

  return (
    <CapturePage
      quotaRemaining={quotaRemaining}
      linkRequired={linkRequired}
      // aiConsentActive は設定取得 API 未実装のため既定 (true) に委ねる seam。
    />
  );
}

/** 撮影画面 container。token 未解決時は既定の CapturePage (撮影可能) を描画する。 */
export function CaptureContainer({ token: injectedToken }: CaptureContainerProps = {}) {
  const auth = useAuthToken();
  const token = injectedToken !== undefined ? injectedToken : auth.token;

  if (!token) {
    return <CapturePage />;
  }
  return <AuthedCapture token={token} />;
}

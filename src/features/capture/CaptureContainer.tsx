/**
 * 撮影画面 container — billing / auth 由来の quota・連携状態を CapturePage に配線する。
 *
 * 配線済み (実データ):
 *   - quotaRemaining: useAiCredits({ token }).credits (残 AI クレジット)。token 未解決時は既定 (十分量)。
 *   - linkRequired: 匿名 (Guest) user かつ trial 超過で連携を促す。trial 超過の正確な判定は
 *     残クレジット 0 を近似シグナルに用いる (匿名 user かつ credits<=0)。
 *
 * seam (未配線):
 *   - aiConsentActive: user_settings (ai_consent_revoked_at) 取得 Function が未実装のため既定 true。
 *     設定取得 API 配線後 (Milestone C) に isAiConsentActive を流し込む。
 *
 * 関連: src/features/capture/pages/CapturePage.tsx, src/features/billing/hooks.ts (useAiCredits),
 *       src/shared/auth/hooks.ts
 */
import { CapturePage } from './pages/CapturePage';
import { useAiCredits } from '../billing';
import { useCurrentUser } from '../../shared/auth/hooks';
import { useAuthToken } from '../../app/useAuthToken';

export type CaptureContainerProps = {
  /** テスト用にトークンを明示注入する (省略時は useAuthToken)。 */
  token?: string | null;
};

/** token がある場合に useAiCredits を起動する内部 container。 */
function AuthedCapture({ token, isAnonymous }: { token: string; isAnonymous: boolean }) {
  const { credits } = useAiCredits({ token });
  // 残クレジットが取れていればそれを quota とする。未取得 (null) は十分量とみなす (CapturePage 既定)。
  const quotaRemaining = credits ?? Number.POSITIVE_INFINITY;
  // 匿名 user かつ残 0 → 連携必須 (trial 超過の近似シグナル)。
  const linkRequired = isAnonymous && credits !== null && credits <= 0;

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
  const currentUser = useCurrentUser();
  const token = injectedToken !== undefined ? injectedToken : auth.token;

  if (!token) {
    return <CapturePage />;
  }
  return <AuthedCapture token={token} isAnonymous={currentUser.isAnonymous} />;
}

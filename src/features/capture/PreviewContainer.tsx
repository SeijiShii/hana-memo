/**
 * 撮影プレビュー container — useCaptureFlow / useImageConvert を PreviewPage.onConfirm に配線する。
 *
 * onConfirm(file, note): File を WebP + EXIF strip に変換 (useImageConvert) → useCaptureFlow.capture で
 * discovery 作成 → R2 upload → identify 起動 までを実行する。pipeline 入力 (userId / capturedAt / season)
 * はアプリ層で導出する (userId=Clerk user id、capturedAt=now、season=getCurrentSeason)。
 *
 * checkQuota / isAiConsentActive は pipeline の事前ガード:
 *   - checkQuota: useAiCredits 由来の残クレジット>0 を返す (token 未解決時は通す近似)。
 *   - isAiConsentActive: user_settings 取得 Function が未実装のため既定 true を返す seam
 *     (設定取得 API 配線後 Milestone C に isAiConsentActive を流し込む)。
 *
 * token=null (未 sign-in / keyless) の間は onConfirm を渡さず、PreviewPage の「これでよい」は
 * /notebook への遷移のみ行う (PreviewPage は onConfirm 未指定なら遷移だけする = 偽の保存をしない)。
 *
 * 注: 実カメラ撮影 (CameraCapture getUserMedia) と R2 実 upload / 実 identify は実ブラウザ + Clerk
 * セッション + R2/OpenAI 環境を要するため、ここでは hook 配線のみ行い実 IO はモックなしで叩かない
 * (実機検証は Milestone C / E2E)。
 *
 * 関連: src/features/capture/pages/PreviewPage.tsx, src/features/capture/hooks.ts (useCaptureFlow),
 *       src/shared/helpers/season.ts, src/shared/auth/hooks.ts
 */
import { PreviewPage } from './pages/PreviewPage';
import { useCaptureFlow, useImageConvert } from './hooks';
import { useIdentifyQuota } from '../billing';
import { useCurrentUser } from '../../shared/auth/hooks';
import { useAuthToken } from '../../app/useAuthToken';
import { getCurrentSeason } from '../../shared/helpers/season';

export type PreviewContainerProps = {
  /** テスト用にトークンを明示注入する (省略時は useAuthToken)。 */
  token?: string | null;
  /** テスト用に userId を明示注入する (省略時は useCurrentUser().clerkUserId)。 */
  userId?: string | null;
};

/** token がある場合に useCaptureFlow を起動する内部 container。 */
function AuthedPreview({ token, userId }: { token: string; userId: string }) {
  const { convert } = useImageConvert();
  // 実効 quota (匿名 trial / 登録 月次無料+credits) で判定する (fix_001)。ai_credits 単独だと
  // 新規匿名 user が trial 枠を使えず即ブロックされる claim_001 のバグになる。
  const { remaining } = useIdentifyQuota({ token });
  const { capture } = useCaptureFlow({
    token,
    // 実効残あり (>0)。未取得 (null) は通す近似 (pipeline 側で Function が最終 enforce)。
    checkQuota: async () => remaining === null || remaining > 0,
    // 設定取得 API 未実装のため既定 true (Milestone C で isAiConsentActive 配線)。
    isAiConsentActive: () => true,
  });

  const onConfirm = async (file: File, userNote?: string) => {
    const blob = await convert(file);
    const now = new Date();
    await capture(blob, {
      userId,
      capturedAt: now.toISOString(),
      season: getCurrentSeason(now),
      userNote,
    });
  };

  return <PreviewPage onConfirm={onConfirm} />;
}

/** 撮影プレビュー container。token / userId 未解決時は onConfirm なし (遷移のみ) で描画する。 */
export function PreviewContainer({
  token: injectedToken,
  userId: injectedUserId,
}: PreviewContainerProps = {}) {
  const auth = useAuthToken();
  const currentUser = useCurrentUser();
  const token = injectedToken !== undefined ? injectedToken : auth.token;
  const userId = injectedUserId !== undefined ? injectedUserId : currentUser.clerkUserId;

  if (!token || !userId) {
    return <PreviewPage />;
  }
  return <AuthedPreview token={token} userId={userId} />;
}

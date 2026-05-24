/**
 * 撮影画面 (UC1 起点) — 見出し + CaptureButton。撮影で得た File を router state に載せて
 * プレビュー画面 (/capture/preview) に遷移する。
 *
 * AI 同意が revoke されている場合は撮影ボタンの代わりに「AI 同意が必要です」+ 設定画面誘導を出す
 * (SPEC §4.1 ai_consent_revoked / §4.2 周辺)。同意・quota の状態はアプリ層 (account / billing hooks)
 * から配線するため、テスト容易性のため props で受け取る (既定は同意済 / quota 十分)。
 *
 * 関連: docs/capture/001_capture_SPEC.md §1 UC1 / §4, docs/capture/002_capture_PLAN.md §1
 */
import { Link, useNavigate } from 'react-router-dom';
import { CaptureButton } from '../components/CaptureButton';

export type CapturePageProps = {
  /** AI 同意が有効か (account.isAiConsentActive 由来)。既定 true。 */
  aiConsentActive?: boolean;
  /** 残 quota (AI クレジット)。既定は十分量。 */
  quotaRemaining?: number;
  /** 匿名 trial 超過で OAuth 連携が必要なとき true。 */
  linkRequired?: boolean;
};

/** 撮影画面。撮影 → プレビューへ遷移。同意 revoke 時は設定誘導。 */
export function CapturePage({
  aiConsentActive = true,
  quotaRemaining = Number.POSITIVE_INFINITY,
  linkRequired = false,
}: CapturePageProps) {
  const navigate = useNavigate();

  const handleCapture = (file: File) => {
    navigate('/capture/preview', { state: { file } });
  };

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-6 bg-white p-6 text-neutral-800">
      <h1 className="text-xl font-bold text-green-700">植物を撮影</h1>
      {aiConsentActive ? (
        <>
          <p className="max-w-sm text-center text-sm text-neutral-500">
            草花を 1 枚撮ると AI が名前を推定します。
          </p>
          <CaptureButton
            quotaRemaining={quotaRemaining}
            linkRequired={linkRequired}
            onCapture={handleCapture}
          />
        </>
      ) : (
        <div className="flex max-w-sm flex-col items-center gap-3 text-center">
          <p className="text-sm text-neutral-600">AI 同意が必要です</p>
          <Link
            to="/settings"
            className="rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700"
          >
            設定画面へ
          </Link>
        </div>
      )}
    </main>
  );
}

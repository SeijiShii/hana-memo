/**
 * 発見ノート container — 実 hook (useNotebook / useMemories / useExport) を NotebookPage の
 * props-seam に配線する。token は app 層 useAuthToken から取得する。
 *
 * 配線:
 *   - useNotebook({ token }) → discoveries / loading / error
 *   - useMemories({ token }) → memories / loading (「去年の今頃」)
 *   - usePdfUnlocked({ token }) + useExport({ token, pdfUnlocked }) → exportProps (CSV は end-to-end、
 *     PDF/画像 ZIP の実レンダラ注入は Milestone C のため未配線 = 「準備中」表示)
 *   - PDF アンロック導線 (onUnlock) は /billing へ遷移する
 *
 * token=null (未 sign-in / keyless) の間はデータ取得をスキップし、空の NotebookPage を描画する
 * (画面は空状態を出すだけでクラッシュしない)。
 *
 * サムネ resolveThumbnail は seam: NotebookDiscovery は imageObjectKey を持つ (/api/notebook/list が
 * images.r2_object_key を載せる) ようになったが、それを /api/storage/signed-url に渡す per-card の
 * 非同期署名取得は実 R2 を要する runtime 配線 (Milestone C / E2E gate)。それまでは null を返し、各 view の
 * プレースホルダにフォールバックさせる。MemoryDiscovery (recommend.ts) も同様に imageObjectKey を持つ。
 *
 * 関連: src/features/notebook/pages/NotebookPage.tsx, src/features/notebook/hooks.ts,
 *       src/features/export/hooks.ts, src/features/billing/hooks.ts
 */
import { useNavigate } from 'react-router-dom';
import { useNotebook } from './hooks';
import { useSignedThumbnails } from './useSignedThumbnails';
import { NotebookPage } from './pages/NotebookPage';
import { useMemories } from '../memory';
import { useAuthToken } from '../../app/useAuthToken';

export type NotebookContainerProps = {
  /** テスト用にトークンを明示注入する (省略時は useAuthToken)。 */
  token?: string | null;
};

/** token がある (= sign-in 済) 場合に実 hook を起動する内部 container。 */
function AuthedNotebook({ token }: { token: string }) {
  const navigate = useNavigate();
  const { discoveries, loading, error } = useNotebook({ token });
  const { memories, loading: memoriesLoading } = useMemories({ token });

  // 実サムネ署名 URL を解決 (revise_001、resolveThumbnail seam に配線)。
  const { resolveThumbnail } = useSignedThumbnails(discoveries, { token });
  const { resolveThumbnail: resolveMemoryThumbnail } = useSignedThumbnails(memories, { token });

  // エクスポート (書き出す) は当面 UI 非表示 (2026-05-25 ユーザー判断、可逆)。
  // exportProps を渡さない = NotebookPage がボタン + ダイアログを描画しない。
  // export feature コード / api/export / billing PWYW-PDF / concept UC3 は休眠で維持 (復活は exportProps 再注入)。
  return (
    <NotebookPage
      discoveries={discoveries}
      loading={loading}
      error={error}
      memories={memories}
      memoriesLoading={memoriesLoading}
      resolveThumbnail={resolveThumbnail}
      resolveMemoryThumbnail={resolveMemoryThumbnail}
      onSelect={(d) => navigate(`/notebook/${d.id}`)}
      onSelectMemory={(m) => navigate(`/notebook/${m.id}`)}
    />
  );
}

/**
 * 発見ノート container。token 解決前 / 未 sign-in は素の NotebookPage (空状態) を描画し、
 * token 確定後に実 hook 配線版へ切り替える。
 */
export function NotebookContainer({ token: injectedToken }: NotebookContainerProps = {}) {
  const auth = useAuthToken();
  const token = injectedToken !== undefined ? injectedToken : auth.token;

  if (!token) {
    // 未 sign-in / token 未解決 (keyless 含む): 空のノートを描画する (データ取得しない)。
    return <NotebookPage />;
  }
  return <AuthedNotebook token={token} />;
}

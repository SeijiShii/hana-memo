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
 * サムネ resolveThumbnail は seam: NotebookDiscovery / MemoryDiscovery が画像 objectKey を持たないため
 * (types.ts / recommend.ts 参照)、storage 署名付き URL を per-card で引けない。データ層が objectKey を
 * 載せるまでは null を返し、各 view のプレースホルダにフォールバックさせる (TODO: 要データ層拡張)。
 *
 * 関連: src/features/notebook/pages/NotebookPage.tsx, src/features/notebook/hooks.ts,
 *       src/features/export/hooks.ts, src/features/billing/hooks.ts
 */
import { useNavigate } from 'react-router-dom';
import { useNotebook } from './hooks';
import { NotebookPage } from './pages/NotebookPage';
import { useMemories } from '../memory';
import { useExport } from '../export';
import { usePdfUnlocked } from '../billing';
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
  const { unlocked } = usePdfUnlocked({ token });
  const pdfUnlocked = unlocked === true;
  const { exportCsv, exporting, error: exportError } = useExport({ token, pdfUnlocked });

  return (
    <NotebookPage
      discoveries={discoveries}
      loading={loading}
      error={error}
      memories={memories}
      memoriesLoading={memoriesLoading}
      exportProps={{
        onExportCsv: () => exportCsv(),
        // PDF / 画像 ZIP の実 jsPDF/JSZip レンダラ注入は Milestone C (未配線 = ダイアログで「準備中」表示)。
        pdfUnlocked,
        onUnlock: () => navigate('/billing'),
        exporting,
        error: exportError,
      }}
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

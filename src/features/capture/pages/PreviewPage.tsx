/**
 * 撮影プレビュー画面 (UC1 ステップ4) — 撮影画像のプレビュー + 補助メモ + 「これでよい / 撮り直し」。
 *
 * - File は撮影画面から router state (`{ file }`) で受け取る。deep link 等で File が無い場合は /capture へ redirect (UC3 相当)。
 * - 補助メモは sanitizeUserNote / MAX_USER_NOTE で trim + 200 文字 cap (SPEC §2.2 / §4.1)。
 * - 「撮り直し」 → /capture へ戻る (UC3 中断)。
 * - 「これでよい」 → onConfirm(file, note) を実行 (実体は呼び出し側が useCaptureFlow 等を配線) → /notebook へ遷移。
 *   onConfirm 未注入時は遷移のみ行う (画面単体の動作確認用)。
 *
 * useCaptureFlow を直接呼ばず onConfirm を注入する理由: useCaptureFlow.capture は Blob + パイプライン入力
 * (userId/capturedAt/season/token) を要求し、それらは本画面の責務外のため、配線はアプリ層に委ねてテスト容易性を保つ。
 *
 * 関連: docs/capture/001_capture_SPEC.md §1 UC1 / §2.2 / §4.1, docs/capture/002_capture_PLAN.md §1
 */
import { useMemo, useState } from 'react';
import { useLocation, useNavigate, Navigate } from 'react-router-dom';
import { Check } from 'lucide-react';
import { MAX_USER_NOTE, sanitizeUserNote } from '../note';
import { CaptureProgress } from '../components/CaptureProgress';
import type { CaptureStage } from '../flow';

export type PreviewPageProps = {
  /**
   * 「これでよい」押下時の確定処理 (実体は useCaptureFlow を配線)。整形済みメモを渡す。
   * onStage は体感段階の通知 (進捗オーバーレイ用、O45)。
   */
  onConfirm?: (
    file: File,
    userNote?: string,
    onStage?: (stage: CaptureStage) => void,
  ) => void | Promise<void>;
};

type PreviewLocationState = { file?: File } | null;

/** 撮影プレビュー画面。File 無しは /capture へ redirect。 */
export function PreviewPage({ onConfirm }: PreviewPageProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as PreviewLocationState;
  const file = state?.file ?? null;

  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [stage, setStage] = useState<CaptureStage | null>(null);

  // File からプレビュー URL を生成 (File が無い場合は使われない)。
  const previewUrl = useMemo(() => (file ? URL.createObjectURL(file) : null), [file]);

  // deep link / 直アクセスで File が無い → 撮影画面へ戻す。
  if (!file) {
    return <Navigate to="/capture" replace />;
  }

  const handleConfirm = async () => {
    setSubmitting(true);
    setStage('preparing');
    try {
      await onConfirm?.(file, sanitizeUserNote(note), setStage);
      navigate('/notebook');
    } finally {
      setSubmitting(false);
      setStage(null);
    }
  };

  return (
    <main className="flex min-h-dvh flex-col items-center gap-6 bg-paper p-6 text-ink">
      {submitting ? <CaptureProgress stage={stage ?? 'preparing'} /> : null}
      <h1 className="text-xl font-bold text-moss-dark">この写真でよいですか？</h1>
      {previewUrl ? (
        <img
          src={previewUrl}
          alt="撮影プレビュー"
          className="max-h-80 w-full max-w-sm rounded-2xl object-cover"
        />
      ) : null}
      <label className="flex w-full max-w-sm flex-col gap-1 text-sm text-ink-soft">
        補助メモ (任意)
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value.slice(0, MAX_USER_NOTE))}
          maxLength={MAX_USER_NOTE}
          rows={3}
          placeholder="気づいたこと (例: 道端に咲いていた)"
          className="rounded-lg border border-line p-2 text-sm text-ink"
        />
        <span className="self-end text-xs text-ink-faint">
          {note.length} / {MAX_USER_NOTE}
        </span>
      </label>
      <div className="flex w-full max-w-sm flex-col gap-2">
        <button type="button" disabled={submitting} onClick={handleConfirm} className="btn-primary">
          <Check size={18} aria-hidden />
          これでよい
        </button>
        <button
          type="button"
          disabled={submitting}
          onClick={() => navigate('/capture')}
          className="rounded-pill px-4 py-2 text-sm text-ink-faint hover:bg-surface-soft disabled:opacity-50"
        >
          撮り直し
        </button>
      </div>
    </main>
  );
}

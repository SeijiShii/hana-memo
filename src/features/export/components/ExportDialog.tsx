/**
 * エクスポートダイアログ — 図鑑データを CSV / PDF / 画像 ZIP で書き出す (UC1/UC2/UC4)。
 *
 * フォーマットを選択して「書き出す」を押すと、選択中フォーマットに対応する export アクションを起動する。
 * 各 export アクション (CSV/PDF/画像 ZIP) は副作用 (データ取得 + Blob 生成 + ダウンロード) を持つため、
 * テスト容易性のため props で注入する (capture/notebook/memory の props-seam パターンに準拠)。
 * アプリ層 (App.tsx) で useExport を呼び、CSV は exportCsv を、PDF/画像 ZIP は実 jsPDF/JSZip レンダラを
 * 注入した exportPdf / image-zip ジェネレータを流し込む想定 (実 PDF/ZIP 生成は Milestone C E2E)。
 *
 * - CSV は end-to-end 配線済 (純粋な文字列生成、exportApi.downloadTextFile)。
 * - PDF は users.pdf_unlocked=true が前提 (E-EX-004)。未 unlock 時は「アンロックする」誘導に変化し、
 *   押下で onUnlock (billing UC2 へ) を起動する。
 * - 書き出し中は全操作を disable し進捗表示。完了 / エラーはフィードバックを出す。
 *
 * 関連: docs/export/001_export_SPEC.md §1 UC1/UC2/UC4 §4 (E-EX-001/003/004),
 *       docs/export/002_export_PLAN.md §1, docs/export/004_export_E2E_TEST.md (E-EX-1/3/4)
 */
import { useState } from 'react';
import { Download, Lock } from 'lucide-react';
import { cn } from '../../../lib/utils';

/** 書き出しフォーマット。CSV (無料) / PDF (unlock 必須) / 画像 ZIP (無料)。 */
export type ExportFormat = 'csv' | 'pdf' | 'image-zip';

const FORMAT_TABS: { format: ExportFormat; label: string }[] = [
  { format: 'csv', label: 'CSV' },
  { format: 'pdf', label: 'PDF' },
  { format: 'image-zip', label: '画像 ZIP' },
];

const FORMAT_DESCRIPTION: Record<ExportFormat, string> = {
  csv: '全データを CSV で書き出します (無料)。Excel で開けます。',
  pdf: '図鑑を PDF で書き出します (アンロックが必要です)。',
  'image-zip': '撮影した画像をまとめて ZIP で書き出します (無料)。',
};

export type ExportDialogProps = {
  /** true で表示する。false のとき何も描画しない (QuotaModal パターン)。 */
  open: boolean;
  /** 閉じる操作 (背景 / 「閉じる」)。 */
  onClose: () => void;
  /** 初期選択フォーマット。既定 'csv'。 */
  initialFormat?: ExportFormat;
  /** CSV 書き出し (exportApi 経由、end-to-end 配線済)。 */
  onExportCsv: () => Promise<void> | void;
  /**
   * PDF 書き出し。実 jsPDF/html2canvas レンダラを注入した生成関数 (Milestone C で実体配線)。
   * 未指定時は PDF タブで「準備中」を表示する。
   */
  onExportPdf?: () => Promise<void> | void;
  /**
   * 画像 ZIP 書き出し。実 JSZip ジェネレータを注入した生成関数 (Milestone C で実体配線)。
   * 未指定時は画像 ZIP タブで「準備中」を表示する。
   */
  onExportImageZip?: () => Promise<void> | void;
  /** PDF unlock 済か (billing usePdfUnlocked 由来)。既定 false (E-EX-004)。 */
  pdfUnlocked?: boolean;
  /** 未 unlock 時の PDF アンロック導線 (billing UC2 へ)。 */
  onUnlock?: () => void;
  /** 書き出し中フラグ (アプリ層 useExport.exporting 由来)。既定 false。 */
  exporting?: boolean;
  /** 書き出しエラー (アプリ層 useExport.error 由来)。 */
  error?: Error | null;
};

/** エクスポートダイアログ。フォーマット選択 + 書き出し起動。open=false で何も描画しない。 */
export function ExportDialog({
  open,
  onClose,
  initialFormat = 'csv',
  onExportCsv,
  onExportPdf,
  onExportImageZip,
  pdfUnlocked = false,
  onUnlock,
  exporting = false,
  error = null,
}: ExportDialogProps) {
  const [format, setFormat] = useState<ExportFormat>(initialFormat);
  // ローカルの起動エラー (注入アクションの reject)。アプリ層 error props と OR で表示する。
  const [localError, setLocalError] = useState<Error | null>(null);

  if (!open) {
    return null;
  }

  // PDF は未 unlock だとアンロック誘導に置き換わる (E-EX-004)。
  const pdfLocked = format === 'pdf' && !pdfUnlocked;

  // 選択フォーマットの export アクション (未配線の PDF/画像 ZIP は null)。
  const action: (() => Promise<void> | void) | null =
    format === 'csv'
      ? onExportCsv
      : format === 'pdf'
        ? (onExportPdf ?? null)
        : (onExportImageZip ?? null);

  const handleExport = async () => {
    if (!action || exporting) {
      return;
    }
    setLocalError(null);
    try {
      await action();
    } catch (err) {
      setLocalError(err instanceof Error ? err : new Error(String(err)));
    }
  };

  const shownError = error ?? localError;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="データを書き出す"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
    >
      <div className="w-full max-w-sm rounded-card bg-surface p-6 shadow-lift">
        <h2 className="text-lg font-bold text-ink">データを書き出す</h2>

        <nav className="mt-4 flex gap-1 rounded-xl bg-surface-soft p-1" aria-label="書き出し形式">
          {FORMAT_TABS.map((tab) => (
            <button
              key={tab.format}
              type="button"
              onClick={() => {
                setFormat(tab.format);
                setLocalError(null);
              }}
              disabled={exporting}
              aria-pressed={format === tab.format}
              className={cn(
                'flex-1 rounded-lg px-2 py-1.5 text-xs font-semibold disabled:opacity-50',
                format === tab.format
                  ? 'bg-surface text-moss-dark shadow-sm'
                  : 'text-ink-faint hover:text-ink-soft',
              )}
            >
              {tab.label}
            </button>
          ))}
        </nav>

        <p className="mt-3 text-sm text-ink-soft">{FORMAT_DESCRIPTION[format]}</p>

        {shownError ? (
          <p role="alert" className="mt-3 text-sm text-red-500">
            書き出しに失敗しました
          </p>
        ) : null}

        <div className="mt-5 flex flex-col gap-2">
          {pdfLocked ? (
            // E-EX-004: 未 unlock の PDF はアンロック誘導に置き換える。
            <button type="button" onClick={onUnlock} className="btn-primary">
              <Lock size={18} aria-hidden />
              アンロックする (¥500 PWYW)
            </button>
          ) : action ? (
            <button
              type="button"
              onClick={handleExport}
              disabled={exporting}
              aria-busy={exporting}
              className="btn-primary"
            >
              <Download size={18} aria-hidden />
              {exporting ? '書き出し中…' : '書き出す'}
            </button>
          ) : (
            // PDF/画像 ZIP の実ジェネレータ未配線 (Milestone C)。
            <p className="rounded-lg bg-surface-soft px-4 py-2 text-center text-sm text-ink-faint">
              準備中です
            </p>
          )}
          <button
            type="button"
            onClick={onClose}
            disabled={exporting}
            className="rounded-pill px-4 py-2 text-sm text-ink-faint hover:bg-surface-soft disabled:opacity-50"
          >
            閉じる
          </button>
        </div>
      </div>
    </div>
  );
}

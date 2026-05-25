/**
 * 単一同意チェックボックス + ラベル + 全文閲覧リンク (legal SPEC §2.2 / PLAN §1.1)。
 *
 * 法的同意 UI のためアクセシビリティ重視 (label と input の関連付け、キーボード操作可)。
 * 「全文を見る」リンクは対応する静的ページ (/legal/*) へ react-router で遷移する。
 * 純粋な制御コンポーネント (checked / onChange を親が保持) で、同意ロジックは持たない。
 *
 * 関連: docs/legal/001_legal_SPEC.md §1 UC1/UC4 §2.2, 002_legal_PLAN.md §1.1
 */
import { Link } from 'react-router-dom';
import type { DocType } from '../../../shared/types/domain';
import { LEGAL_DOC_META } from '../docs';

export type ConsentCheckboxProps = {
  /** 同意対象の doc_type。ラベル・リンク先は LEGAL_DOC_META から解決する。 */
  docType: DocType;
  /** チェック状態 (親が保持)。 */
  checked: boolean;
  /** チェック状態変更時。 */
  onChange: (checked: boolean) => void;
  /** disable (送信中など)。既定 false。 */
  disabled?: boolean;
};

/** 単一の同意チェックボックス。label とリンクで構成し、checked は親が制御する。 */
export function ConsentCheckbox({
  docType,
  checked,
  onChange,
  disabled = false,
}: ConsentCheckboxProps) {
  const meta = LEGAL_DOC_META[docType];
  const inputId = `consent-${docType}`;
  return (
    <div className="flex items-start gap-2">
      <input
        id={inputId}
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-1 h-4 w-4 shrink-0 rounded border-line text-moss focus:ring-moss disabled:opacity-50"
      />
      <label htmlFor={inputId} className="text-sm text-ink-soft">
        <span className="font-semibold text-ink">{meta.label}</span>
        <span>に同意します</span>
        {meta.path ? (
          <Link to={meta.path} className="ml-2 text-moss-dark underline hover:text-moss">
            全文を見る
          </Link>
        ) : null}
      </label>
    </div>
  );
}

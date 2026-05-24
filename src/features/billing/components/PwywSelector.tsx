/**
 * PWYW (pay-what-you-want) 金額セレクタ — PDF アンロックの任意金額入力 (UC2)。
 *
 * 推奨金額チップ (¥100 / ¥500 / ¥1000) + カスタム金額入力で構成し、
 * pricing.ts の範囲 (PWYW_MIN_JPY〜PWYW_MAX_JPY) に対し validatePwywAmount で検証する。
 * 入力は親に value/onChange で持たせる制御コンポーネント (ExportDialog のタブ state パターンに準拠)。
 * 範囲外のときは内部で検証エラーメッセージを出し、親には valid フラグを伝える (onValidChange)。
 *
 * 関連: docs/billing/001_billing_SPEC.md §1 UC2 / §2.2 / §4.1 (PWYW 100-10000),
 *       docs/billing/002_billing_PLAN.md Phase 2 (PdfUnlockPage)
 */
import { cn } from '../../../lib/utils';
import { InvalidAmountError } from '../errors';
import {
  PWYW_MIN_JPY,
  PWYW_MAX_JPY,
  PWYW_PRESET_JPY,
  validatePwywAmount,
} from '../pricing';

/** 推奨金額チップ (PLAN §6: 最低 / 推奨 / もう一声)。 */
export const PWYW_SUGGESTED_JPY: readonly number[] = [PWYW_MIN_JPY, PWYW_PRESET_JPY, 1000];

/** 円表記に整形する (例: 500 → "¥500")。 */
export function formatJpy(yen: number): string {
  return `¥${yen.toLocaleString('ja-JP')}`;
}

export type PwywSelectorProps = {
  /** 現在の金額 (yen)。親が state で保持する。 */
  value: number;
  /** 金額変更時 (チップ押下 / カスタム入力)。 */
  onChange: (yen: number) => void;
  /** 検証結果が変わった時に呼ぶ (購入ボタンの enable 判定にアプリ層 / 親が使う)。 */
  onValidChange?: (valid: boolean) => void;
};

/** pricing.validatePwywAmount で範囲検証する (例外は捕捉して boolean に変換)。 */
function isValidAmount(yen: number): boolean {
  try {
    validatePwywAmount(yen);
    return true;
  } catch (err) {
    if (err instanceof InvalidAmountError) {
      return false;
    }
    throw err;
  }
}

/** PWYW 金額セレクタ。推奨チップ + カスタム入力 + 範囲検証メッセージ。 */
export function PwywSelector({ value, onChange, onValidChange }: PwywSelectorProps) {
  const valid = isValidAmount(value);

  const emit = (yen: number) => {
    onChange(yen);
    onValidChange?.(isValidAmount(yen));
  };

  const handleInput = (raw: string) => {
    // 空文字 / 非数値は 0 として扱い「最低 ¥100 です」を出す (E2E E-BL-3)。
    const parsed = raw === '' ? 0 : Number(raw);
    emit(Number.isNaN(parsed) ? 0 : parsed);
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex gap-2" role="group" aria-label="推奨金額">
        {PWYW_SUGGESTED_JPY.map((amount) => (
          <button
            key={amount}
            type="button"
            onClick={() => emit(amount)}
            aria-pressed={value === amount}
            className={cn(
              'flex-1 rounded-lg border px-2 py-2 text-sm font-semibold',
              value === amount
                ? 'border-green-600 bg-green-50 text-green-700'
                : 'border-neutral-200 text-neutral-600 hover:border-neutral-300',
            )}
          >
            {formatJpy(amount)}
          </button>
        ))}
      </div>

      <label className="flex flex-col gap-1 text-sm text-neutral-600">
        カスタム金額 (円)
        <input
          type="number"
          inputMode="numeric"
          min={PWYW_MIN_JPY}
          max={PWYW_MAX_JPY}
          value={value === 0 ? '' : value}
          onChange={(e) => handleInput(e.target.value)}
          aria-label="カスタム金額 (円)"
          aria-invalid={!valid}
          className="rounded-lg border border-neutral-200 px-3 py-2 text-base text-neutral-800 focus:border-green-600 focus:outline-none"
        />
      </label>

      {!valid ? (
        <p role="alert" className="text-sm text-red-500">
          最低 {formatJpy(PWYW_MIN_JPY)} です（最大 {formatJpy(PWYW_MAX_JPY)}）
        </p>
      ) : null}
    </div>
  );
}

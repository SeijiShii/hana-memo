/**
 * 課金画面 (UC1) — AI 識別クレジット追加購入。
 *
 * capture の QuotaModal の導線から `/billing` に遷移して到達する。
 * 現在のクレジット残を表示し、AI 枠を購入する。
 *
 * 副作用の seam:
 *   実際の購入は createCheckout で Stripe Checkout URL を取得 → window 遷移、という外部副作用を伴う。
 *   テスト容易性と「実 Stripe を叩かない」要件のため、購入処理は props.onCheckout(input) で注入する
 *   (capture/notebook の props-injection seam パターンに準拠)。アプリ層 (App.tsx) で
 *   createCheckout + リダイレクト (location.assign 等) を配線した onCheckout を渡す想定。
 *   本画面は Stripe へのリダイレクトを一切行わず、onCheckout の呼び出しに留める。
 *
 * OAuth ゲート:
 *   匿名 (Guest) user は購入不可 (E-BL-002)。isLinked=false のとき購入操作で OAuthRequiredModal を開き、
 *   連携を促す (既存 OAuthRequiredModal を再利用、重複実装しない)。
 *
 * 状態表示:
 *   - statusLoading かつ未取得 → ローディング
 *   - statusError → ステータス取得エラー
 *   - 購入処理中 → 「処理中…」+ ボタン disable
 *   - checkoutError → 購入失敗フィードバック (E-BL-001)
 *   - 戻り (success) → checkoutComplete=true で受領確認 (BillingSuccessPage から or props)
 *
 * 関連: docs/billing/001_billing_SPEC.md §1 UC1 / §2.2 / §4 (E-BL-001/002),
 *       docs/billing/002_billing_PLAN.md §1 (BillingPage / AiCreditsPurchasePage)
 */
import { useState } from 'react';
import { CreditCard } from 'lucide-react';
import { OAuthRequiredModal } from '../OAuthRequiredModal';
import {
  AI_QTY_MIN,
  AI_QTY_MAX,
  AI_CREDITS_PER_UNIT,
  aiCreditsAmountJpy,
  aiCreditsGranted,
} from '../pricing';
import type { CheckoutInput, BillingStatus } from '../api';

/** 円表記に整形する (例: 500 → "¥500")。 */
function formatJpy(yen: number): string {
  return `¥${yen.toLocaleString('ja-JP')}`;
}

export type BillingPageProps = {
  /** 現在の課金ステータス (アプリ層 useBillingStatus 由来)。未取得は null。 */
  status?: BillingStatus | null;
  /** ステータス取得中フラグ。既定 false。 */
  statusLoading?: boolean;
  /** ステータス取得エラー。 */
  statusError?: Error | null;
  /** OAuth リンク済か (_shared/auth.isLinked 由来)。既定 true。false で購入時にゲート表示 (E-BL-002)。 */
  isLinked?: boolean;
  /** 「連携する」押下時 (_shared/auth.linkWithGoogle を配線)。 */
  onLink?: () => void;
  /**
   * 購入起動 (Stripe Checkout 作成 + リダイレクトの seam)。
   * アプリ層で createCheckout + location 遷移を配線する。本画面は呼ぶだけで実リダイレクトしない。
   */
  onCheckout: (input: CheckoutInput) => Promise<void> | void;
  /** 購入処理中フラグ (アプリ層由来 or 内部起動)。既定 false。 */
  checkoutPending?: boolean;
  /** 購入エラー (E-BL-001、アプリ層 createCheckout 失敗由来)。 */
  checkoutError?: Error | null;
  /** success_url 戻りで受領確認を出すとき true (BillingSuccessPage / アプリ層由来)。 */
  checkoutComplete?: boolean;
};

/** 課金画面。AI 枠購入を onCheckout を起動する。 */
export function BillingPage({
  status = null,
  statusLoading = false,
  statusError = null,
  isLinked = true,
  onLink,
  onCheckout,
  checkoutPending = false,
  checkoutError = null,
  checkoutComplete = false,
}: BillingPageProps) {
  const [qty, setQty] = useState<number>(AI_QTY_MIN);
  // 購入操作で OAuth 未連携を検知したら開く (E-BL-002)。
  const [gateOpen, setGateOpen] = useState(false);
  // 注入 onCheckout の reject を拾うローカルエラー (アプリ層 checkoutError と OR 表示)。
  const [localError, setLocalError] = useState<Error | null>(null);

  const qtyValid = qty >= AI_QTY_MIN && qty <= AI_QTY_MAX && Number.isInteger(qty);

  const canPurchase = !checkoutPending && qtyValid;

  const handlePurchase = async () => {
    if (!canPurchase) {
      return;
    }
    // E-BL-002: 匿名 user は OAuth ゲートを出して購入を中断する。
    if (!isLinked) {
      setGateOpen(true);
      return;
    }
    setLocalError(null);
    try {
      await onCheckout({ type: 'ai_credits', quantity: qty });
    } catch (err) {
      setLocalError(err instanceof Error ? err : new Error(String(err)));
    }
  };

  const shownError = checkoutError ?? localError;

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col gap-4 bg-paper p-4 text-ink">
      <h1 className="text-xl font-bold text-moss-dark">クレジット購入</h1>

      {/* 現在のステータス表示 (UC4) */}
      <section
        aria-label="現在のステータス"
        className="rounded-xl bg-surface-soft p-4 text-sm text-ink-soft"
      >
        {statusLoading && !status ? (
          <p className="text-ink-faint">読み込み中…</p>
        ) : statusError ? (
          <p role="alert" className="text-red-500">
            ステータスの取得に失敗しました
          </p>
        ) : status ? (
          <div className="flex flex-col gap-1">
            <p>AI 識別: 残 {status.aiCreditsRemaining} 回</p>
          </div>
        ) : (
          <p className="text-ink-faint">ステータス未取得</p>
        )}
      </section>

      {/* success_url 戻りの受領確認 (UC1、E-BL-005 反映済) */}
      {checkoutComplete ? (
        <p
          role="status"
          className="rounded-lg bg-moss-light px-4 py-2 text-sm font-semibold text-moss-dark"
        >
          購入が完了しました。ありがとうございます。
        </p>
      ) : null}

      {/* AI 識別クレジット購入 */}
      <section aria-label="AI 識別クレジット購入" className="flex flex-col gap-3">
        <p className="text-sm text-ink-soft">
          1 セット {formatJpy(aiCreditsAmountJpy(1))} で AI 識別が {AI_CREDITS_PER_UNIT}{' '}
          回追加されます。
        </p>
        <label className="flex flex-col gap-1 text-sm text-ink-soft">
          数量 ({AI_QTY_MIN}〜{AI_QTY_MAX} セット)
          <input
            type="number"
            inputMode="numeric"
            min={AI_QTY_MIN}
            max={AI_QTY_MAX}
            value={qty}
            onChange={(e) => {
              const next = Number(e.target.value);
              setQty(Number.isNaN(next) ? AI_QTY_MIN : next);
            }}
            aria-label="数量"
            className="rounded-lg border border-line px-3 py-2 text-base text-ink focus:border-moss focus:outline-none"
          />
        </label>
        {qtyValid ? (
          <p className="text-sm font-semibold text-ink-soft">
            合計 {formatJpy(aiCreditsAmountJpy(qty))}（{aiCreditsGranted(qty)} 回追加）
          </p>
        ) : (
          <p role="alert" className="text-sm text-red-500">
            数量は {AI_QTY_MIN}〜{AI_QTY_MAX} の整数で入力してください
          </p>
        )}
      </section>

      {shownError ? (
        <p role="alert" className="text-sm text-red-500">
          決済システムが応答しません。時間をおいて再度お試しください。
        </p>
      ) : null}

      {/* 購入ボタン (Stripe Checkout の seam) */}
      <button
        type="button"
        onClick={handlePurchase}
        disabled={!canPurchase}
        aria-busy={checkoutPending}
        className="btn-primary"
      >
        <CreditCard size={18} aria-hidden />
        {checkoutPending ? '処理中…' : '購入する'}
      </button>

      {/* E-BL-002: 匿名 user 向け OAuth 連携ゲート (既存モーダルを再利用) */}
      <OAuthRequiredModal
        open={gateOpen}
        onLink={() => onLink?.()}
        onClose={() => setGateOpen(false)}
      />
    </main>
  );
}

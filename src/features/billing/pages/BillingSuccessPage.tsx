/**
 * 決済完了戻り画面 (UC1/UC2、success_url) — `/billing/success?session_id=...` で到達する。
 *
 * Stripe Checkout から戻ると Webhook 反映に最大数十秒のラグがあるため (E-BL-005)、
 * session_id で billing_unlocks を poll し、反映を確認してから受領メッセージを出す。
 * poll の実体 (confirmCheckout = fetch + sleep の外部副作用) はアプリ層が onConfirm として注入する
 * (props-injection seam パターン)。本画面は実 fetch を一切行わない。
 *
 * 状態:
 *   - confirming → 「処理中…」(poll 中)
 *   - 反映確認 → 受領メッセージ + notebook 戻り導線
 *   - timeout / 失敗 (CheckoutPendingError 等) → 「処理中です。後ほどご確認ください」
 *
 * 関連: docs/billing/001_billing_SPEC.md §1 UC1 step6 / §4.2 (E-BL-005),
 *       docs/billing/002_billing_PLAN.md §1 (BillingSuccessPage)
 */
import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import type { ConfirmResult } from '../api';

export type BillingSuccessPageProps = {
  /**
   * session_id で Webhook 反映を待つ poll (アプリ層が confirmCheckout を配線)。
   * 未指定 (session_id なし) のとき即座に確認不能扱いとする。本画面は実 fetch しない。
   */
  onConfirm?: (sessionId: string) => Promise<Extract<ConfirmResult, { found: true }>>;
};

type Phase = 'confirming' | 'confirmed' | 'pending';

/** 決済完了戻り画面。session_id を poll して受領を確認する。 */
export function BillingSuccessPage({ onConfirm }: BillingSuccessPageProps) {
  const [params] = useSearchParams();
  const sessionId = params.get('session_id');
  const [phase, setPhase] = useState<Phase>('confirming');
  const [result, setResult] = useState<Extract<ConfirmResult, { found: true }> | null>(null);

  useEffect(() => {
    let cancelled = false;
    if (!sessionId || !onConfirm) {
      setPhase('pending');
      return;
    }
    void (async () => {
      try {
        const confirmed = await onConfirm(sessionId);
        if (!cancelled) {
          setResult(confirmed);
          setPhase('confirmed');
        }
      } catch {
        // CheckoutPendingError / network 等 → 「処理中」表示にフォールバック (E-BL-005)。
        if (!cancelled) {
          setPhase('pending');
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [sessionId, onConfirm]);

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col items-center justify-center gap-4 bg-white p-6 text-center text-neutral-800">
      {phase === 'confirming' ? (
        <p role="status" className="text-sm text-neutral-500">
          処理中…
        </p>
      ) : phase === 'confirmed' ? (
        <>
          <h1 className="text-xl font-bold text-green-700">購入が完了しました</h1>
          <p className="text-sm text-neutral-600">
            {result?.type === 'ai_credits'
              ? `AI 識別の残り回数が ${result.aiCreditsRemaining} 回になりました。`
              : 'PDF エクスポートをアンロックしました。'}
          </p>
        </>
      ) : (
        <>
          <h1 className="text-xl font-bold text-neutral-800">処理中です</h1>
          <p className="text-sm text-neutral-600">
            決済の反映には少し時間がかかる場合があります。後ほどご確認ください。
          </p>
        </>
      )}
      <Link
        to="/notebook"
        className="rounded-lg bg-green-600 px-6 py-3 text-sm font-semibold text-white hover:bg-green-700"
      >
        発見ノートへ戻る
      </Link>
    </main>
  );
}

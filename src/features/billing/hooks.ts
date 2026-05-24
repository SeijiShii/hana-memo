/**
 * 課金 React hooks — users.ai_credits_remaining / pdf_unlocked を監視する。
 *
 * 元 PLAN は Supabase Realtime 購読を想定していたが、Vercel+Neon 構成に Realtime が無いため
 * 「mount 時 fetch + 明示 refresh()」で代替する (決済確定 poll や手動更新で呼ぶ)。
 *
 * 関連: docs/billing/001_billing_SPEC.md §1 UC3, 002_billing_PLAN.md Phase 3 (UT-BL-H01〜H03)
 */
import { useCallback, useEffect, useState } from 'react';
import { fetchBillingStatus, type BillingApiOptions, type BillingStatus } from './api';

export type UseBillingStatusResult = {
  status: BillingStatus | null;
  loading: boolean;
  error: Error | null;
  /** 最新ステータスを再取得する (決済確定後 / 手動更新)。 */
  refresh: () => Promise<void>;
};

/** 課金ステータスを取得・保持する基底 hook。 */
export function useBillingStatus(opts: BillingApiOptions): UseBillingStatusResult {
  const { token, fetchFn, endpoint } = opts;
  const [status, setStatus] = useState<BillingStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const next = await fetchBillingStatus({ token, fetchFn, endpoint });
      setStatus(next);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setLoading(false);
    }
  }, [token, fetchFn, endpoint]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { status, loading, error, refresh };
}

/** 残 AI クレジットを監視する (UT-BL-H01/H02)。 */
export function useAiCredits(opts: BillingApiOptions): {
  credits: number | null;
  loading: boolean;
  error: Error | null;
  refresh: () => Promise<void>;
} {
  const { status, loading, error, refresh } = useBillingStatus(opts);
  return { credits: status?.aiCreditsRemaining ?? null, loading, error, refresh };
}

/** PDF unlock 状態を監視する (UT-BL-H03)。 */
export function usePdfUnlocked(opts: BillingApiOptions): {
  unlocked: boolean | null;
  loading: boolean;
  error: Error | null;
  refresh: () => Promise<void>;
} {
  const { status, loading, error, refresh } = useBillingStatus(opts);
  return { unlocked: status?.pdfUnlocked ?? null, loading, error, refresh };
}

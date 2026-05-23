/**
 * リトライ orchestration (exponential backoff、sleep 注入可)
 * 関連: docs/_shared/ai/001_ai_SPEC.md §5.1 (E-AI-001/002), 003_ai_UNIT_TEST.md §1.5 (UT-AI-O01〜O05)
 */
import { AfterRetryError } from './errors';

/** OpenAI 5xx 用のデフォルト backoff (1s/2s/4s) */
export const BACKOFF_MS = [1000, 2000, 4000];

export type RetryOptions = {
  /** リトライ回数 (初回呼出は含まない)。デフォルト = backoffMs.length */
  maxRetries?: number;
  backoffMs?: number[];
  /** テスト用に注入可。デフォルトは setTimeout */
  sleep?: (ms: number) => Promise<void>;
  /** false を返す err は即 throw (リトライしない、例: 401) */
  isRetryable?: (err: unknown) => boolean;
};

const defaultSleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

/**
 * fn をリトライ付きで実行する。
 * - 成功: 即 return
 * - retryable な失敗: backoff 後リトライ、maxRetries 超過で AfterRetryError
 * - non-retryable な失敗: 元エラーを即 throw
 */
export async function withRetry<T>(fn: () => Promise<T>, opts: RetryOptions = {}): Promise<T> {
  const backoff = opts.backoffMs ?? BACKOFF_MS;
  const maxRetries = opts.maxRetries ?? backoff.length;
  const sleep = opts.sleep ?? defaultSleep;
  const isRetryable = opts.isRetryable ?? (() => true);

  let lastErr: unknown;
  for (let attempt = 0; ; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      if (!isRetryable(err)) throw err;
      if (attempt >= maxRetries) {
        throw new AfterRetryError(`failed after ${maxRetries} retries`, lastErr);
      }
      await sleep(backoff[Math.min(attempt, backoff.length - 1)]!);
    }
  }
}

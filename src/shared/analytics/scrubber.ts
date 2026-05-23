/**
 * PII スクラバ ([SEC-004] Sentry / Slack 送信前の個人情報マスク、個人情報保護法対応)
 *
 * `scrub<T>(value)` は文字列・配列・オブジェクトを再帰的に走査し、PII パターンを mask 文字列に置換する。
 * Sentry `beforeSend` / `beforeBreadcrumb` フックおよび Slack 通知本文に適用する。
 *
 * 関連: docs/_shared/analytics/revise_sec_004_sentry_pii_scrub_20260523/001_REVISE_SPEC.md §7.2
 *      docs/_shared/analytics/902_analytics_IMPL_SECURITY_CHECKLIST.md
 */

/** PII 検出パターン (適用順に評価。前段の置換が後段に影響する点に注意) */
export const PII_PATTERNS: { re: RegExp; mask: string }[] = [
  // email (URL クエリ内も含む)
  { re: /\b[\w.+-]+@[\w.-]+\.\w+\b/gi, mask: '***@***' },
  // 緯度経度 (小数 4 桁以上)
  { re: /\b-?\d{1,3}\.\d{4,}\b/g, mask: '<coord>' },
  // Stripe id (cus_/pi_/cs_/sub_/in_)
  { re: /\b(?:cus|pi|cs|sub|in)_[A-Za-z0-9]+\b/g, mask: '<stripe_id>' },
  // Clerk session token
  { re: /\bsess_[A-Za-z0-9_-]+\b/g, mask: '<clerk_session>' },
  // Clerk user id
  { re: /\buser_[A-Za-z0-9]+\b/g, mask: '<clerk_uid>' },
  // クレジットカード番号 (4 グループ)
  { re: /\b\d{3,4}-?\d{4}-?\d{4,}-?\d{4}\b/g, mask: '<card>' },
  // 日本の電話番号
  { re: /\b0\d{1,4}-?\d{1,4}-?\d{4}\b/g, mask: '<phone-jp>' },
];

/**
 * 文字列に全 PII パターンを順次適用して mask する。
 * `String.prototype.replace` は global regex の lastIndex を呼び出しごとに reset するため、
 * 共有 RegExp を再利用しても状態汚染は起きない。
 */
function scrubString(input: string): string {
  let out = input;
  for (const { re, mask } of PII_PATTERNS) {
    out = out.replace(re, mask);
  }
  return out;
}

/**
 * 任意の値から PII を再帰的にスクラブする。
 * - null / undefined / プリミティブ (string 以外) は素通し
 * - string はパターン置換
 * - 配列 / プレーンオブジェクトは要素・値を再帰スクラブ (構造は保持)
 *
 * @param value 任意の値 (Sentry event / breadcrumb / Slack 通知文 等)
 * @returns 同じ型でスクラブ済みの値
 */
export function scrub<T>(value: T): T {
  if (value == null) return value;
  if (typeof value === 'string') {
    return scrubString(value) as T;
  }
  if (Array.isArray(value)) {
    return value.map((v) => scrub(v)) as T;
  }
  if (typeof value === 'object') {
    // Date / RegExp 等の組込オブジェクトはそのまま返す (列挙して壊さない)
    if (value instanceof Date || value instanceof RegExp) return value;
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      out[k] = scrub(v);
    }
    return out as T;
  }
  return value;
}

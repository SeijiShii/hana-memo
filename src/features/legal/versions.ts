/**
 * 法務文書バージョン管理 + 再同意判定 (純関数)
 * 関連: docs/legal/001_legal_SPEC.md §3, 003_legal_UNIT_TEST.md §1.6 (V01〜V04) / §1.2 (H04〜H06)
 */
import type { DocType } from '../../shared/types/domain';

/** アプリ側の最新バージョン定数。cookie_policy は [論点-005] 解決後に追加 */
export const LATEST_VERSIONS: Record<DocType, string | null> = {
  privacy_policy: 'v1.0.0',
  terms_of_service: 'v1.0.0',
  ai_usage: 'v1.0.0',
  cookie_policy: null,
};

/** `vX.Y.Z` をパース。形式不正は null。 */
export function parseSemver(v: string): [number, number, number] | null {
  const m = /^v(\d+)\.(\d+)\.(\d+)$/.exec(v);
  if (!m) return null;
  return [Number(m[1]), Number(m[2]), Number(m[3])];
}

/**
 * a と b を比較。a<b → -1 / a==b → 0 / a>b → 1。
 * どちらかが形式不正なら null (呼び出し側で安全側に倒す)。
 */
export function compareVersion(a: string, b: string): -1 | 0 | 1 | null {
  const pa = parseSemver(a);
  const pb = parseSemver(b);
  if (!pa || !pb) return null;
  for (let i = 0; i < 3; i++) {
    if (pa[i]! < pb[i]!) return -1;
    if (pa[i]! > pb[i]!) return 1;
  }
  return 0;
}

export type ReConsentResult = {
  needsReConsent: boolean;
  /** 再同意が必要な doc_type 一覧 */
  diffs: DocType[];
};

/**
 * 現在の同意バージョン (doc_type → version) と最新を比較し、再同意が必要な doc を返す。
 * - latest が null の doc は対象外 (未導入)
 * - current が無い / current < latest → 再同意要
 * - current >= latest → 不要 (current が新しい場合は警告 log)
 * - 形式不正 → 安全側に倒して再同意要 (V04)
 */
export function needsReConsent(
  current: Partial<Record<DocType, string>>,
  latest: Record<DocType, string | null> = LATEST_VERSIONS,
): ReConsentResult {
  const diffs: DocType[] = [];
  for (const docType of Object.keys(latest) as DocType[]) {
    const latestV = latest[docType];
    if (!latestV) continue; // 未導入 doc は対象外
    const currentV = current[docType];
    if (!currentV) {
      diffs.push(docType);
      continue;
    }
    const cmp = compareVersion(currentV, latestV);
    if (cmp === null) {
      // 形式不正 → 安全側 (再同意要)
      console.error(`needsReConsent: invalid version for ${docType}: ${currentV} vs ${latestV}`);
      diffs.push(docType);
    } else if (cmp < 0) {
      diffs.push(docType);
    }
  }
  return { needsReConsent: diffs.length > 0, diffs };
}

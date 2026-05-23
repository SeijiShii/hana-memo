/**
 * 同意レコードの構築・検証・最新導出 (UI/DB 非依存コア)
 *
 * 実 DB INSERT (Drizzle consent_logs) は `ConsentStore` (DI) で注入。ip_hash は
 * `_shared/helpers/id.ts hashIp` を呼び出し側で計算して渡す (本モジュールは純粋)。
 *
 * 関連: docs/legal/001_legal_SPEC.md §1/§2, 003_legal_UNIT_TEST.md §1.1 (A01〜A06, E03)
 */
import type { DocType } from '../../shared/types/domain';
import { LATEST_VERSIONS, parseSemver } from './versions';
import { ConsentError } from './errors';

export type ConsentRecord = {
  userId: string;
  docType: DocType;
  docVersion: string;
  ipHash: string | null;
};

/** doc_version の入力検証 (null/空/形式不正は ConsentError、E-LE / UT-LE-E03)。 */
export function validateConsentInput(docType: string, docVersion: string | null | undefined): void {
  if (!docType) throw new ConsentError('docType is required');
  if (!docVersion) throw new ConsentError(`docVersion is required for ${docType}`);
  if (!parseSemver(docVersion)) throw new ConsentError(`invalid docVersion: ${docVersion}`);
}

/**
 * 同意操作の consent_logs INSERT 用レコードを構築する。
 * versions から各 doc の最新バージョンを引き、検証してレコード化。
 */
export function buildConsentRecords(
  userId: string,
  docTypes: DocType[],
  versions: Record<DocType, string | null> = LATEST_VERSIONS,
  ipHash: string | null = null,
): ConsentRecord[] {
  if (!userId) throw new ConsentError('userId is required');
  return docTypes.map((docType) => {
    const docVersion = versions[docType];
    validateConsentInput(docType, docVersion);
    return { userId, docType, docVersion: docVersion as string, ipHash };
  });
}

/** consent_logs 行から doc_type 別の最新同意バージョンを導出する (UT-LE-A04/A05)。 */
export function deriveLatestConsents(
  rows: { docType: string; docVersion: string; agreedAt: Date | string }[],
): Record<string, string> {
  const latest: Record<string, string> = {};
  const latestAt: Record<string, number> = {};
  for (const row of rows) {
    const at = new Date(row.agreedAt).getTime();
    if (latestAt[row.docType] === undefined || at >= latestAt[row.docType]!) {
      latest[row.docType] = row.docVersion;
      latestAt[row.docType] = at;
    }
  }
  return latest;
}

/** consent_logs への append-only 書き込みを抽象化 (実体は Drizzle を api/ 層で注入)。 */
export type ConsentStore = {
  insertConsents(records: ConsentRecord[]): Promise<void>;
};

/** 構築済みレコードを store に記録する。 */
export async function recordConsents(store: ConsentStore, records: ConsentRecord[]): Promise<void> {
  if (records.length === 0) return;
  await store.insertConsents(records);
}

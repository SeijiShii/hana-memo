/**
 * 同意状況取得・記録エンドポイント (/api/legal/consents)
 *
 * GET : 当該 user の consent_logs から doc_type 別の最新同意バージョンを導出して返す
 *       (deriveLatestConsents、UC3 設定画面表示 / UC1・UC4 の再同意判定)。
 * POST: { docTypes: DocType[] } を受け、LATEST_VERSIONS で各 doc の最新版を引いて
 *       consent_logs に append-only INSERT (buildConsentRecords + recordConsents、UC1/UC4)。
 *       ip_hash は CONSENT_IP_SALT + client IP が揃う時のみ計算 (schema は nullable)。
 *       cookie_policy は LATEST_VERSIONS=null のため記録不可 (core が ConsentError→400)。
 * いずれも Clerk JWT → Neon users.id 解決 + user_id スコープ強制 ([SEC-005])。DB アクセスは
 * dynamic import + ConsentStore/loadLatest 注入で unit test を DB 非依存に保つ。
 *
 * 関連: docs/legal/001_legal_SPEC.md §1 UC1/UC3/UC4 §2.1, 003_legal_UNIT_TEST.md §1.1
 */
import { verifyClerkSession, UnauthorizedError } from '../_lib/clerk';
import { resolveUserId, UserNotFoundError } from '../_lib/user';
import {
  buildConsentRecords,
  deriveLatestConsents,
  recordConsents,
  type ConsentStore,
  type ConsentRecord,
} from '../../src/features/legal/consent';
import { LATEST_VERSIONS } from '../../src/features/legal/versions';
import { ConsentError } from '../../src/features/legal/errors';
import { hashIp } from '../../src/shared/helpers/id';
import type { DocType } from '../../src/shared/types/domain';

const DOC_TYPES: DocType[] = ['privacy_policy', 'terms_of_service', 'ai_usage', 'cookie_policy'];

/** POST body から docTypes を検証・抽出する (純関数、重複除去)。不正は ConsentError。 */
export function parseConsentDocTypes(raw: unknown): DocType[] {
  const b = (raw ?? {}) as Record<string, unknown>;
  const list = b.docTypes;
  if (!Array.isArray(list) || list.length === 0) {
    throw new ConsentError('docTypes must be a non-empty array');
  }
  const out: DocType[] = [];
  for (const item of list) {
    if (typeof item !== 'string' || !DOC_TYPES.includes(item as DocType)) {
      throw new ConsentError(`invalid docType: ${String(item)}`);
    }
    if (!out.includes(item as DocType)) out.push(item as DocType);
  }
  return out;
}

/** x-forwarded-for / x-real-ip から client IP を取り出す (純関数、無ければ null)。 */
export function extractClientIp(req: Request): string | null {
  const fwd = req.headers.get('x-forwarded-for');
  if (fwd) {
    const first = fwd.split(',')[0]?.trim();
    if (first) return first;
  }
  const real = req.headers.get('x-real-ip');
  return real?.trim() || null;
}

function jsonResponse(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

/** consent_logs を user_id で引き、doc_type 別の最新バージョンを導出する (DB 依存)。 */
async function loadLatestConsents(userId: string): Promise<Record<string, string>> {
  const [{ db }, { consentLogs }, { eq }] = await Promise.all([
    import('../../src/shared/db/client'),
    import('../../src/shared/db/schema'),
    import('drizzle-orm'),
  ]);
  const rows = await db
    .select({
      docType: consentLogs.docType,
      docVersion: consentLogs.docVersion,
      agreedAt: consentLogs.agreedAt,
    })
    .from(consentLogs)
    .where(eq(consentLogs.userId, userId)); // [SEC-005]
  return deriveLatestConsents(rows);
}

/** consent_logs への append-only INSERT を Drizzle で実体化した ConsentStore。 */
function createDrizzleConsentStore(): ConsentStore {
  return {
    async insertConsents(records: ConsentRecord[]): Promise<void> {
      const [{ db }, { consentLogs }] = await Promise.all([
        import('../../src/shared/db/client'),
        import('../../src/shared/db/schema'),
      ]);
      await db.insert(consentLogs).values(
        records.map((r) => ({
          userId: r.userId,
          docType: r.docType,
          docVersion: r.docVersion,
          ipHash: r.ipHash,
        })),
      );
    },
  };
}

export type ConsentsDeps = {
  /** Clerk session 検証 (既定: verifyClerkSession)。 */
  verifySession?: (req: Request) => Promise<{ clerkUserId: string }>;
  /** clerkUserId → Neon users.id (既定: resolveUserId)。 */
  resolveUser?: (clerkUserId: string) => Promise<string>;
  /** GET: 最新同意ロード (既定: Drizzle SELECT)。 */
  loadLatest?: (userId: string) => Promise<Record<string, string>>;
  /** POST: consent 記録 store (既定: Drizzle INSERT)。 */
  store?: ConsentStore;
  /** ip_hash 用 salt (既定: process.env.CONSENT_IP_SALT)。 */
  ipSalt?: string;
};

export const config = { runtime: 'nodejs' };

/** GET/POST /api/legal/consents の本体 (deps 注入で DB 非依存にテスト可能)。 */
export async function handleConsents(req: Request, deps: ConsentsDeps = {}): Promise<Response> {
  const method = req.method;
  if (method !== 'GET' && method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 });
  }

  const verifySession = deps.verifySession ?? ((r: Request) => verifyClerkSession(r));
  const resolveUser = deps.resolveUser ?? ((id: string) => resolveUserId(id));

  let clerkUserId: string;
  try {
    ({ clerkUserId } = await verifySession(req));
  } catch (err) {
    return jsonResponse(
      { error: 'unauthorized' },
      err instanceof UnauthorizedError ? err.status : 500,
    );
  }

  try {
    const userId = await resolveUser(clerkUserId);

    if (method === 'GET') {
      const load = deps.loadLatest ?? loadLatestConsents;
      return jsonResponse({ consents: await load(userId) }, 200);
    }

    // POST
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      body = {};
    }
    const docTypes = parseConsentDocTypes(body);
    const ipSalt = deps.ipSalt ?? process.env.CONSENT_IP_SALT;
    const ip = extractClientIp(req);
    const ipHash = ipSalt && ip ? await hashIp(ip, ipSalt) : null;
    const records = buildConsentRecords(userId, docTypes, LATEST_VERSIONS, ipHash);
    const store = deps.store ?? createDrizzleConsentStore();
    await recordConsents(store, records);
    return jsonResponse({ ok: true, recorded: records.length }, 201);
  } catch (err) {
    if (err instanceof UserNotFoundError) {
      return jsonResponse({ error: 'user_not_found' }, err.status);
    }
    if (err instanceof ConsentError) {
      return jsonResponse({ error: err.message }, 400);
    }
    return jsonResponse({ error: 'internal' }, 500);
  }
}

/** Vercel Web handler。 */
function handler(req: Request): Promise<Response> {
  return handleConsents(req);
}

export default { fetch: handler };

/**
 * ユーザー設定 取得・更新エンドポイント (/api/account/settings)
 *
 * GET  : 当該 user の user_settings を返す (行が無ければ既定値、UC3 設定画面表示)。
 * PATCH: { locationPrecision?, aiConsentRevokedAt?, analyticsOptIn? } を検証して
 *        user_settings に upsert し、更新後の view を返す (UC3/UC7)。
 *        AI 同意 OFF→ON の ai_usage consent_log 記録は /api/legal/consents (POST) が担当
 *        (関心分離。frontend は OFF→ON 時に両方を呼ぶ)。
 * いずれも Clerk JWT → Neon users.id 解決 + user_id スコープ強制 ([SEC-005])。DB アクセスは
 * dynamic import + loadSettings/saveSettings 注入で unit test を DB 非依存に保つ。
 *
 * 関連: docs/account/001_account_SPEC.md UC3/UC7 §2.1, 003_account_UNIT_TEST.md §1.6-§1.8,
 *       src/features/account/{settings.ts,SettingsContainer.tsx}
 */
import { verifyClerkSession, UnauthorizedError } from '../_lib/clerk';
import { resolveUserId, UserNotFoundError } from '../_lib/user';
import {
  validateLocationPrecision,
  type LocationPrecision,
} from '../../src/features/account/settings';
import { AccountError } from '../../src/features/account/errors';

/** user_settings 行の永続化対象列 (UI/DB 共通の表現)。 */
export type SettingsRow = {
  locationPrecision: LocationPrecision;
  aiConsentRevokedAt: Date | null;
  analyticsOptIn: boolean;
};

/** PATCH で受け付ける部分更新 (列の部分集合)。 */
export type SettingsPatch = Partial<SettingsRow>;

/** GET/PATCH 応答の JSON view (Date は ISO 文字列に整形)。 */
export type SettingsView = {
  locationPrecision: LocationPrecision;
  aiConsentRevokedAt: string | null;
  analyticsOptIn: boolean;
};

/** 行未作成 user の既定値 (schema default に一致: coarse / 同意有効 / analytics off)。 */
export const DEFAULT_SETTINGS_VIEW: SettingsView = {
  locationPrecision: 'coarse',
  aiConsentRevokedAt: null,
  analyticsOptIn: false,
};

/** PATCH body を検証・正規化する (純関数、与えられた列のみ含む)。不正は AccountError。 */
export function parseSettingsPatch(raw: unknown): SettingsPatch {
  const b = (raw ?? {}) as Record<string, unknown>;
  const patch: SettingsPatch = {};

  if ('locationPrecision' in b) {
    patch.locationPrecision = validateLocationPrecision(String(b.locationPrecision));
  }
  if ('aiConsentRevokedAt' in b) {
    const v = b.aiConsentRevokedAt;
    if (v === null) {
      patch.aiConsentRevokedAt = null;
    } else if (typeof v === 'string' || v instanceof Date) {
      const d = new Date(v);
      if (Number.isNaN(d.getTime())) {
        throw new AccountError(`invalid aiConsentRevokedAt: ${String(v)}`);
      }
      patch.aiConsentRevokedAt = d;
    } else {
      throw new AccountError(`invalid aiConsentRevokedAt: ${String(v)}`);
    }
  }
  if ('analyticsOptIn' in b) {
    if (typeof b.analyticsOptIn !== 'boolean') {
      throw new AccountError(`analyticsOptIn must be boolean`);
    }
    patch.analyticsOptIn = b.analyticsOptIn;
  }
  return patch;
}

/** user_settings 行を JSON view に整形する (純関数)。 */
export function settingsRowToView(row: SettingsRow): SettingsView {
  return {
    locationPrecision: row.locationPrecision,
    aiConsentRevokedAt: row.aiConsentRevokedAt ? row.aiConsentRevokedAt.toISOString() : null,
    analyticsOptIn: row.analyticsOptIn,
  };
}

function jsonResponse(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

/** user_settings を user_id で 1 行引く (DB 依存)。未作成なら null。 */
async function loadSettingsRow(userId: string): Promise<SettingsRow | null> {
  const [{ db }, { userSettings }, { eq }] = await Promise.all([
    import('../../src/shared/db/client'),
    import('../../src/shared/db/schema'),
    import('drizzle-orm'),
  ]);
  const rows = await db
    .select({
      locationPrecision: userSettings.locationPrecision,
      aiConsentRevokedAt: userSettings.aiConsentRevokedAt,
      analyticsOptIn: userSettings.analyticsOptIn,
    })
    .from(userSettings)
    .where(eq(userSettings.userId, userId)) // [SEC-005]
    .limit(1);
  return rows[0] ?? null;
}

/** user_settings に upsert し、更新後の行を返す (DB 依存)。 */
async function saveSettingsRow(userId: string, patch: SettingsPatch): Promise<SettingsRow> {
  const [{ db }, { userSettings }] = await Promise.all([
    import('../../src/shared/db/client'),
    import('../../src/shared/db/schema'),
  ]);
  const set = { ...patch, updatedAt: new Date() };
  const rows = await db
    .insert(userSettings)
    .values({ userId, ...patch })
    .onConflictDoUpdate({ target: userSettings.userId, set })
    .returning({
      locationPrecision: userSettings.locationPrecision,
      aiConsentRevokedAt: userSettings.aiConsentRevokedAt,
      analyticsOptIn: userSettings.analyticsOptIn,
    });
  return rows[0]!;
}

export type SettingsDeps = {
  /** Clerk session 検証 (既定: verifyClerkSession)。 */
  verifySession?: (req: Request) => Promise<{ clerkUserId: string }>;
  /** clerkUserId → Neon users.id (既定: resolveUserId)。 */
  resolveUser?: (clerkUserId: string) => Promise<string>;
  /** GET: user_settings ロード (既定: Drizzle SELECT)。 */
  loadSettings?: (userId: string) => Promise<SettingsRow | null>;
  /** PATCH: user_settings upsert (既定: Drizzle INSERT .. ON CONFLICT)。 */
  saveSettings?: (userId: string, patch: SettingsPatch) => Promise<SettingsRow>;
};

export const config = { runtime: 'nodejs' };

/** GET/PATCH /api/account/settings の本体 (deps 注入で DB 非依存にテスト可能)。 */
export async function handleSettings(req: Request, deps: SettingsDeps = {}): Promise<Response> {
  const method = req.method;
  if (method !== 'GET' && method !== 'PATCH') {
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
      const load = deps.loadSettings ?? loadSettingsRow;
      const row = await load(userId);
      return jsonResponse({ settings: row ? settingsRowToView(row) : DEFAULT_SETTINGS_VIEW }, 200);
    }

    // PATCH
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      body = {};
    }
    const patch = parseSettingsPatch(body);
    const save = deps.saveSettings ?? saveSettingsRow;
    const row = await save(userId, patch);
    return jsonResponse({ settings: settingsRowToView(row) }, 200);
  } catch (err) {
    if (err instanceof UserNotFoundError) {
      return jsonResponse({ error: 'user_not_found' }, err.status);
    }
    if (err instanceof AccountError) {
      return jsonResponse({ error: err.reason }, 400);
    }
    return jsonResponse({ error: 'internal' }, 500);
  }
}

/** Vercel Web handler。 */
function handler(req: Request): Promise<Response> {
  return handleSettings(req);
}

export default { fetch: handler };

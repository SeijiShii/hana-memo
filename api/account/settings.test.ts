/**
 * api/account/settings.ts 単体テスト (PATCH body 検証 + view 整形 + handler 配線)
 *
 * user_settings の load/upsert は loadSettings/saveSettings 注入で DB 非依存に保つ
 * (notebook/list.ts・consents.ts と同方針)。core (validateLocationPrecision) は
 * settings.test.ts で別途検証済。AI 同意 OFF→ON の ai_usage consent_log は
 * /api/legal/consents (POST) が担当 (本 endpoint は user_settings 永続化のみ)。
 *
 * 由来: docs/account/001_account_SPEC.md UC3/UC7 §2.1, 003_account_UNIT_TEST.md §1.6-§1.8
 */
import { describe, it, expect } from 'vitest';
import {
  parseSettingsPatch,
  settingsRowToView,
  DEFAULT_SETTINGS_VIEW,
  handleSettings,
  type SettingsRow,
  type SettingsDeps,
} from './settings';
import { AccountError } from '../../src/features/account/errors';

describe('parseSettingsPatch', () => {
  it('locationPrecision を検証して通す', () => {
    expect(parseSettingsPatch({ locationPrecision: 'precise' })).toEqual({
      locationPrecision: 'precise',
    });
  });

  it('不正な locationPrecision は AccountError', () => {
    expect(() => parseSettingsPatch({ locationPrecision: 'bogus' })).toThrow(AccountError);
  });

  it('aiConsentRevokedAt: null をそのまま通す (OFF→ON)', () => {
    expect(parseSettingsPatch({ aiConsentRevokedAt: null })).toEqual({ aiConsentRevokedAt: null });
  });

  it('aiConsentRevokedAt: ISO 文字列を Date に変換', () => {
    const out = parseSettingsPatch({ aiConsentRevokedAt: '2026-05-25T00:00:00.000Z' });
    expect(out.aiConsentRevokedAt).toBeInstanceOf(Date);
    expect((out.aiConsentRevokedAt as Date).toISOString()).toBe('2026-05-25T00:00:00.000Z');
  });

  it('不正な aiConsentRevokedAt 文字列は AccountError', () => {
    expect(() => parseSettingsPatch({ aiConsentRevokedAt: 'not-a-date' })).toThrow(AccountError);
  });

  it('analyticsOptIn boolean を通す', () => {
    expect(parseSettingsPatch({ analyticsOptIn: true })).toEqual({ analyticsOptIn: true });
  });

  it('analyticsOptIn が boolean でなければ AccountError', () => {
    expect(() => parseSettingsPatch({ analyticsOptIn: 'yes' })).toThrow(AccountError);
  });

  it('空 patch は空オブジェクト (no-op)', () => {
    expect(parseSettingsPatch({})).toEqual({});
  });
});

describe('settingsRowToView', () => {
  it('aiConsentRevokedAt を ISO 文字列に整形', () => {
    const row: SettingsRow = {
      locationPrecision: 'coarse',
      aiConsentRevokedAt: new Date('2026-05-25T00:00:00.000Z'),
      analyticsOptIn: false,
    };
    expect(settingsRowToView(row)).toEqual({
      locationPrecision: 'coarse',
      aiConsentRevokedAt: '2026-05-25T00:00:00.000Z',
      analyticsOptIn: false,
    });
  });

  it('aiConsentRevokedAt が null なら null', () => {
    expect(
      settingsRowToView({ locationPrecision: 'off', aiConsentRevokedAt: null, analyticsOptIn: true }),
    ).toEqual({ locationPrecision: 'off', aiConsentRevokedAt: null, analyticsOptIn: true });
  });
});

describe('handleSettings', () => {
  const baseDeps: SettingsDeps = {
    verifySession: async () => ({ clerkUserId: 'clerk_1' }),
    resolveUser: async () => 'user-uuid-1',
  };

  const patch = (body: unknown) =>
    new Request('https://x.test/api/account/settings', {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    });

  it('GET/PATCH 以外は 405', async () => {
    const res = await handleSettings(
      new Request('https://x.test/api/account/settings', { method: 'POST' }),
      baseDeps,
    );
    expect(res.status).toBe(405);
  });

  it('認証失敗は 401', async () => {
    const { UnauthorizedError } = await import('../_lib/clerk');
    const res = await handleSettings(new Request('https://x.test/api/account/settings'), {
      verifySession: async () => {
        throw new UnauthorizedError('nope');
      },
    });
    expect(res.status).toBe(401);
  });

  it('GET: 行が存在すれば view を返す', async () => {
    const res = await handleSettings(new Request('https://x.test/api/account/settings'), {
      ...baseDeps,
      loadSettings: async (userId) => {
        expect(userId).toBe('user-uuid-1');
        return { locationPrecision: 'precise', aiConsentRevokedAt: null, analyticsOptIn: true };
      },
    });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      settings: { locationPrecision: 'precise', aiConsentRevokedAt: null, analyticsOptIn: true },
    });
  });

  it('GET: 行が無ければ既定値を返す', async () => {
    const res = await handleSettings(new Request('https://x.test/api/account/settings'), {
      ...baseDeps,
      loadSettings: async () => null,
    });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ settings: DEFAULT_SETTINGS_VIEW });
  });

  it('PATCH: parse 済 patch で upsert し更新後 view を返す', async () => {
    let savedPatch: unknown;
    const res = await handleSettings(patch({ locationPrecision: 'off', analyticsOptIn: true }), {
      ...baseDeps,
      saveSettings: async (userId, p) => {
        expect(userId).toBe('user-uuid-1');
        savedPatch = p;
        return { locationPrecision: 'off', aiConsentRevokedAt: null, analyticsOptIn: true };
      },
    });
    expect(res.status).toBe(200);
    expect(savedPatch).toEqual({ locationPrecision: 'off', analyticsOptIn: true });
    expect(await res.json()).toEqual({
      settings: { locationPrecision: 'off', aiConsentRevokedAt: null, analyticsOptIn: true },
    });
  });

  it('PATCH: 不正 locationPrecision は 400', async () => {
    const res = await handleSettings(patch({ locationPrecision: 'bogus' }), {
      ...baseDeps,
      saveSettings: async () => {
        throw new Error('should not be called');
      },
    });
    expect(res.status).toBe(400);
  });

  it('Neon user 不在は 404', async () => {
    const { UserNotFoundError } = await import('../_lib/user');
    const res = await handleSettings(new Request('https://x.test/api/account/settings'), {
      verifySession: async () => ({ clerkUserId: 'clerk_x' }),
      resolveUser: async () => {
        throw new UserNotFoundError();
      },
    });
    expect(res.status).toBe(404);
  });
});

/**
 * api/clerk-webhook.ts 単体テスト (svix 検証 → users 同期、注入版)
 * 由来: 001_auth_SPEC.md §1.2 / §4.2 (E-AU-006 idempotency), 002_auth_PLAN.md Phase 2
 */
import { describe, it, expect, vi } from 'vitest';
import { processClerkWebhook, type SvixHeaders } from './clerk-webhook';
import type { ClerkWebhookEvent, UserSyncStore } from '../src/shared/auth/webhook';

const headers: SvixHeaders = {
  'svix-id': 'msg_1',
  'svix-timestamp': '123',
  'svix-signature': 'v1,sig',
};

function makeStore() {
  return {
    upsertUser: vi.fn(async () => {}),
    softDeleteUser: vi.fn(async () => {}),
  } satisfies UserSyncStore;
}

describe('processClerkWebhook', () => {
  it('署名検証失敗なら 401 + store 未呼出', async () => {
    const store = makeStore();
    const verify = vi.fn(() => {
      throw new Error('bad signature');
    });
    const res = await processClerkWebhook('{}', headers, { verify, store });
    expect(res.status).toBe(401);
    expect(store.upsertUser).not.toHaveBeenCalled();
  });

  it('user.created → upsert (匿名=identity 無し)', async () => {
    const store = makeStore();
    const event: ClerkWebhookEvent = { type: 'user.created', data: { id: 'user_1' } };
    const res = await processClerkWebhook('{}', headers, { verify: () => event, store });
    expect(res.status).toBe(200);
    expect(store.upsertUser).toHaveBeenCalledWith('user_1', {
      email: null,
      isAnonymous: true,
      linkedAt: null,
    });
  });

  it('user.updated (email あり) → upsert + linkedAt set', async () => {
    const store = makeStore();
    const now = new Date('2026-05-24T00:00:00Z');
    const event: ClerkWebhookEvent = {
      type: 'user.updated',
      data: { id: 'user_2', email_addresses: [{ email_address: 'a@example.com' }] },
    };
    await processClerkWebhook('{}', headers, { verify: () => event, store, now });
    expect(store.upsertUser).toHaveBeenCalledWith('user_2', {
      email: 'a@example.com',
      isAnonymous: false,
      linkedAt: now,
    });
  });

  it('user.deleted → softDelete', async () => {
    const store = makeStore();
    const event: ClerkWebhookEvent = { type: 'user.deleted', data: { id: 'user_3' } };
    await processClerkWebhook('{}', headers, { verify: () => event, store });
    expect(store.softDeleteUser).toHaveBeenCalledWith('user_3');
  });

  it('未知イベントは no-op で 200', async () => {
    const store = makeStore();
    const event: ClerkWebhookEvent = { type: 'session.created', data: { id: 'sess_1' } };
    const res = await processClerkWebhook('{}', headers, { verify: () => event, store });
    expect(res.status).toBe(200);
    expect(store.upsertUser).not.toHaveBeenCalled();
    expect(store.softDeleteUser).not.toHaveBeenCalled();
  });
});

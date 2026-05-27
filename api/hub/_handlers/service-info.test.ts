/**
 * service-info 単体テスト (service-hub 連携、O48 / [論点-003] 確定契約)
 */
import { describe, it, expect, afterEach } from 'vitest';
import handler, { verifyHubSecret, buildServiceInfo } from './service-info';

function req(method: string, headers: Record<string, string> = {}): Request {
  return new Request('https://x/api/hub/service-info', { method, headers });
}

describe('verifyHubSecret', () => {
  it('env 未設定 → unconfigured', () => {
    expect(verifyHubSecret(req('GET'), undefined)).toBe('unconfigured');
  });
  it('シークレット欠落 → unauthorized', () => {
    expect(verifyHubSecret(req('GET'), 'sek')).toBe('unauthorized');
  });
  it('Authorization: Bearer 一致 → ok', () => {
    expect(verifyHubSecret(req('GET', { authorization: 'Bearer sek' }), 'sek')).toBe('ok');
  });
  it('x-hub-secret 一致 → ok', () => {
    expect(verifyHubSecret(req('GET', { 'x-hub-secret': 'sek' }), 'sek')).toBe('ok');
  });
  it('不一致 → unauthorized', () => {
    expect(verifyHubSecret(req('GET', { 'x-hub-secret': 'bad' }), 'sek')).toBe('unauthorized');
  });
});

describe('buildServiceInfo', () => {
  it('確定契約の形 (schemaVersion/service/status/metrics)', () => {
    const info = buildServiceInfo({} as NodeJS.ProcessEnv);
    expect(info.schemaVersion).toBe(1);
    expect(info.service).toBe('hana-memo');
    expect(info.status).toBe('ok');
    expect(Array.isArray(info.metrics)).toBe(true);
    expect(info.version).toBeUndefined(); // sha 無し
  });
  it('VERCEL_GIT_COMMIT_SHA があれば version=短縮 sha', () => {
    const info = buildServiceInfo({ VERCEL_GIT_COMMIT_SHA: 'abcdef1234567' } as NodeJS.ProcessEnv);
    expect(info.version).toBe('abcdef1');
  });
});

describe('handler (GET /api/hub/service-info)', () => {
  const orig = process.env.HUB_SHARED_SECRET;
  afterEach(() => {
    if (orig === undefined) delete process.env.HUB_SHARED_SECRET;
    else process.env.HUB_SHARED_SECRET = orig;
  });

  it('GET 以外 → 405', async () => {
    expect((await handler.fetch(req('POST'))).status).toBe(405);
  });
  it('シークレット未設定 → 503', async () => {
    delete process.env.HUB_SHARED_SECRET;
    expect((await handler.fetch(req('GET'))).status).toBe(503);
  });
  it('シークレット不一致 → 401', async () => {
    process.env.HUB_SHARED_SECRET = 'sek';
    expect((await handler.fetch(req('GET', { 'x-hub-secret': 'bad' }))).status).toBe(401);
  });
  it('シークレット一致 → 200 + service-info JSON', async () => {
    process.env.HUB_SHARED_SECRET = 'sek';
    const res = await handler.fetch(req('GET', { authorization: 'Bearer sek' }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toMatchObject({ schemaVersion: 1, service: 'hana-memo', status: 'ok' });
  });
});

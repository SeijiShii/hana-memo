/**
 * api/_lib/router.ts 単体テスト (revise_001 function-consolidation)
 * 由来: 003_REVISE_UNIT_TEST.md §1 (router 層)
 */
import { describe, it, expect } from 'vitest';
import { createGroupRouter } from './router';

const stub = (label: string) => (_req: Request) => new Response(label, { status: 200 });

describe('createGroupRouter', () => {
  const router = createGroupRouter('storage', {
    'upload-url': stub('upload'),
    meta: stub('meta'),
  });

  it('action segment で対応 handler に dispatch する', async () => {
    const res = await router.fetch(
      new Request('http://x/api/storage/upload-url', { method: 'POST' }),
    );
    expect(res.status).toBe(200);
    expect(await res.text()).toBe('upload');
  });

  it('別 action は別 handler に届く', async () => {
    const res = await router.fetch(new Request('http://x/api/storage/meta'));
    expect(await res.text()).toBe('meta');
  });

  it('未知 action は 404 not_found', async () => {
    const res = await router.fetch(new Request('http://x/api/storage/bogus'));
    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: 'not_found' });
  });

  it('action segment が無い (グループのみ) も 404', async () => {
    const res = await router.fetch(new Request('http://x/api/storage'));
    expect(res.status).toBe(404);
  });

  it('末尾スラッシュを許容する', async () => {
    const res = await router.fetch(new Request('http://x/api/storage/meta/'));
    expect(await res.text()).toBe('meta');
  });
});

/**
 * api/storage/_lib/user.ts 単体テスト (Clerk user id → Neon users.id 解決)
 */
import { describe, it, expect, vi } from 'vitest';
import { resolveUserId, UserNotFoundError } from './user';

describe('resolveUserId', () => {
  it('query が id を返したらそれを返す', async () => {
    const query = vi.fn().mockResolvedValue('11111111-2222-3333-4444-555555555555');
    const id = await resolveUserId('clerk_abc', { query });
    expect(id).toBe('11111111-2222-3333-4444-555555555555');
    expect(query).toHaveBeenCalledWith('clerk_abc');
  });

  it('query が null なら UserNotFoundError (status 404)', async () => {
    const query = vi.fn().mockResolvedValue(null);
    await expect(resolveUserId('clerk_missing', { query })).rejects.toBeInstanceOf(UserNotFoundError);
    await expect(resolveUserId('clerk_missing', { query })).rejects.toMatchObject({ status: 404 });
  });
});

/**
 * access.ts unit tests ([SEC-005] 認可ネガティブテスト対応)
 *
 * 003_db_UNIT_TEST.md 由来のテストケース:
 * - withUserScope: userId が scope に閉じ込められる
 * - assertOwner: row.userId !== userId で throw
 * - 認可ネガティブテスト: 他人 uid → throw
 */
import { describe, it, expect } from 'vitest';
import { withUserScope, assertOwner, AuthorizationError } from './access';

describe('withUserScope', () => {
  it('passes userId to the scope', async () => {
    const result = await withUserScope('user_abc', async (scope) => scope.userId);
    expect(result).toBe('user_abc');
  });

  it('returns the value from the inner function', async () => {
    const result = await withUserScope('user_abc', async () => 42);
    expect(result).toBe(42);
  });

  it('throws TypeError when userId is empty string', async () => {
    await expect(withUserScope('', async () => 'ok')).rejects.toThrow(TypeError);
  });

  it('throws TypeError when userId is not a string', async () => {
    // @ts-expect-error - 意図的に型違反
    await expect(withUserScope(null, async () => 'ok')).rejects.toThrow(TypeError);
    // @ts-expect-error 型違反を意図的にテスト
    await expect(withUserScope(undefined, async () => 'ok')).rejects.toThrow(TypeError);
    // @ts-expect-error 型違反を意図的にテスト
    await expect(withUserScope(123, async () => 'ok')).rejects.toThrow(TypeError);
  });

  it('propagates exceptions from the inner function', async () => {
    await expect(
      withUserScope('user_abc', async () => {
        throw new Error('inner failed');
      }),
    ).rejects.toThrow('inner failed');
  });
});

describe('assertOwner', () => {
  it('passes when row.userId matches', () => {
    expect(() => assertOwner({ userId: 'user_abc' }, 'user_abc')).not.toThrow();
  });

  it('passes when row.user_id (snake_case) matches', () => {
    expect(() => assertOwner({ user_id: 'user_abc' }, 'user_abc')).not.toThrow();
  });

  it('throws AuthorizationError when userId mismatches', () => {
    expect(() => assertOwner({ userId: 'user_xyz' }, 'user_abc')).toThrow(AuthorizationError);
  });

  it('throws AuthorizationError with expected/actual fields', () => {
    try {
      assertOwner({ userId: 'user_xyz' }, 'user_abc');
      expect.fail('should have thrown');
    } catch (err) {
      expect(err).toBeInstanceOf(AuthorizationError);
      const e = err as AuthorizationError;
      expect(e.expectedUserId).toBe('user_abc');
      expect(e.actualUserId).toBe('user_xyz');
    }
  });

  it('throws AuthorizationError for snake_case mismatch', () => {
    expect(() => assertOwner({ user_id: 'user_xyz' }, 'user_abc')).toThrow(AuthorizationError);
  });
});

describe('AuthorizationError', () => {
  it('has correct name and message', () => {
    const err = new AuthorizationError('user_abc', 'user_xyz');
    expect(err.name).toBe('AuthorizationError');
    expect(err.message).toContain('user_abc');
    expect(err.message).toContain('user_xyz');
  });

  it('is instanceof Error', () => {
    const err = new AuthorizationError('user_abc', 'user_xyz');
    expect(err).toBeInstanceOf(Error);
  });
});

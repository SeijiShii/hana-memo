/**
 * api/auth/spam-check.ts 単体テスト (trial quota + fingerprint hard cap 判定)
 * 由来: 003_auth_UNIT_TEST.md §1.3 (UT-AU-G03/G04/G05/G08)
 */
import { describe, it, expect } from 'vitest';
import { evaluateSpamCheck, FINGERPRINT_HARD_CAP } from './spam-check';

describe('evaluateSpamCheck', () => {
  it('UT-AU-G03: 匿名 0 回 → remaining=3, mustLink=false', () => {
    const q = evaluateSpamCheck({
      user: { isAnonymous: true, trialUsedCount: 0 },
      fingerprintUserCount: 0,
    });
    expect(q).toMatchObject({ used: 0, max: 3, remaining: 3, mustLink: false });
  });

  it('UT-AU-G04: 匿名 3 回 → remaining=0, mustLink=true', () => {
    const q = evaluateSpamCheck({
      user: { isAnonymous: true, trialUsedCount: 3 },
      fingerprintUserCount: 0,
    });
    expect(q).toMatchObject({ used: 3, max: 3, remaining: 0, mustLink: true });
  });

  it('UT-AU-G05: OAuth user は無制限 (max=Infinity, mustLink=false)', () => {
    const q = evaluateSpamCheck({
      user: { isAnonymous: false, trialUsedCount: 99 },
      fingerprintUserCount: 0,
    });
    expect(q.max).toBe(Number.POSITIVE_INFINITY);
    expect(q.mustLink).toBe(false);
  });

  it('UT-AU-G08: 同 fingerprint が hard cap 到達 (匿名) → mustLink=true', () => {
    const q = evaluateSpamCheck({
      user: { isAnonymous: true, trialUsedCount: 0 },
      fingerprintUserCount: FINGERPRINT_HARD_CAP,
    });
    expect(q.mustLink).toBe(true);
    expect(q.remaining).toBe(0);
  });

  it('OAuth user は fingerprint cap の影響を受けない', () => {
    const q = evaluateSpamCheck({
      user: { isAnonymous: false, trialUsedCount: 0 },
      fingerprintUserCount: FINGERPRINT_HARD_CAP + 50,
    });
    expect(q.mustLink).toBe(false);
  });

  it('user 不在 (未同期) は匿名扱い (max=3) で評価', () => {
    const q = evaluateSpamCheck({ user: null, fingerprintUserCount: 0 });
    expect(q.max).toBe(3);
    expect(q.mustLink).toBe(false);
  });
});

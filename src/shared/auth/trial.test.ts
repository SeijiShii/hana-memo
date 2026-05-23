/**
 * trial.ts 単体テスト (SPAM 抑止 trial クォータ)
 * 由来: 003_auth_UNIT_TEST.md §1.3 (UT-AU-G03〜G07)
 */
import { describe, it, expect } from 'vitest';
import { checkTrialQuota, enforceTrialLimit, ANON_TRIAL_MAX } from './trial';
import { LinkRequiredError } from './errors';

describe('checkTrialQuota', () => {
  it('UT-AU-G03: 匿名 0 回 → remaining=3, mustLink=false', () => {
    expect(checkTrialQuota({ isAnonymous: true, trialUsedCount: 0 })).toEqual({
      used: 0,
      max: 3,
      remaining: 3,
      mustLink: false,
    });
  });

  it('UT-AU-G04: 匿名 3 回 → remaining=0, mustLink=true', () => {
    expect(checkTrialQuota({ isAnonymous: true, trialUsedCount: 3 })).toEqual({
      used: 3,
      max: 3,
      remaining: 0,
      mustLink: true,
    });
  });

  it('UT-AU-G05: OAuth user → max/remaining=Infinity, mustLink=false', () => {
    const q = checkTrialQuota({ isAnonymous: false, trialUsedCount: 99 });
    expect(q.max).toBe(Number.POSITIVE_INFINITY);
    expect(q.remaining).toBe(Number.POSITIVE_INFINITY);
    expect(q.mustLink).toBe(false);
  });

  it('超過 (used > max) でも remaining は 0 で下限クランプ', () => {
    expect(checkTrialQuota({ isAnonymous: true, trialUsedCount: 5 }).remaining).toBe(0);
  });

  it('max を上書きできる', () => {
    expect(checkTrialQuota({ isAnonymous: true, trialUsedCount: 1, max: 10 }).mustLink).toBe(false);
  });

  it('ANON_TRIAL_MAX は 3', () => {
    expect(ANON_TRIAL_MAX).toBe(3);
  });
});

describe('enforceTrialLimit', () => {
  it('UT-AU-G06: mustLink=true → LinkRequiredError throw', () => {
    const q = checkTrialQuota({ isAnonymous: true, trialUsedCount: 3 });
    expect(() => enforceTrialLimit(q)).toThrow(LinkRequiredError);
  });

  it('UT-AU-G07: mustLink=false → throw しない', () => {
    const q = checkTrialQuota({ isAnonymous: true, trialUsedCount: 1 });
    expect(() => enforceTrialLimit(q)).not.toThrow();
  });

  it('LinkRequiredError に quota が乗る', () => {
    const q = checkTrialQuota({ isAnonymous: true, trialUsedCount: 3 });
    try {
      enforceTrialLimit(q);
      expect.unreachable();
    } catch (e) {
      expect(e).toBeInstanceOf(LinkRequiredError);
      expect((e as LinkRequiredError).quota).toEqual({ used: 3, max: 3, remaining: 0 });
    }
  });
});

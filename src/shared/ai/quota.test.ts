import { describe, it, expect } from 'vitest';
import { checkQuota, consumeQuota, effectiveQuota, MONTHLY_FREE_LIMIT } from './quota';
import { QuotaExceededError } from './errors';
import { ANON_TRIAL_MAX } from '../auth/trial';

describe('checkQuota / consumeQuota (既存)', () => {
  it('remaining>0 で ok、消費で -1', () => {
    expect(checkQuota(2)).toEqual({ ok: true, remaining: 2 });
    expect(consumeQuota(2)).toBe(1);
  });
  it('remaining<=0 で consume は QuotaExceededError', () => {
    expect(() => consumeQuota(0)).toThrow(QuotaExceededError);
  });
});

describe('effectiveQuota — 匿名 (fix_001)', () => {
  it('新規匿名 (trial_used=0) → remaining=ANON_TRIAL_MAX, consume=trial, mustLink=false', () => {
    const q = effectiveQuota({
      isAnonymous: true,
      trialUsedCount: 0,
      monthlyUsedCount: 0,
      aiCreditsRemaining: 0,
    });
    expect(q).toEqual({ remaining: ANON_TRIAL_MAX, mustLink: false, consume: 'trial' });
  });

  it('匿名 trial 残 1 → remaining=1, consume=trial', () => {
    const q = effectiveQuota({
      isAnonymous: true,
      trialUsedCount: ANON_TRIAL_MAX - 1,
      monthlyUsedCount: 0,
      aiCreditsRemaining: 0,
    });
    expect(q.remaining).toBe(1);
    expect(q.consume).toBe('trial');
  });

  it('匿名 trial 使い切り → remaining=0, mustLink=true, consume=none', () => {
    const q = effectiveQuota({
      isAnonymous: true,
      trialUsedCount: ANON_TRIAL_MAX,
      monthlyUsedCount: 0,
      aiCreditsRemaining: 99, // 匿名は購入クレジットを参照しない
    });
    expect(q).toEqual({ remaining: 0, mustLink: true, consume: 'none' });
  });
});

describe('effectiveQuota — 登録 (fix_001)', () => {
  it('登録 + 当月 0 → remaining=月次無料+credits, consume=monthly', () => {
    const q = effectiveQuota({
      isAnonymous: false,
      trialUsedCount: 0,
      monthlyUsedCount: 0,
      aiCreditsRemaining: 5,
    });
    expect(q.remaining).toBe(MONTHLY_FREE_LIMIT + 5);
    expect(q.mustLink).toBe(false);
    expect(q.consume).toBe('monthly');
  });

  it('登録 + 月次使い切り + credits>0 → consume=credits', () => {
    const q = effectiveQuota({
      isAnonymous: false,
      trialUsedCount: 0,
      monthlyUsedCount: MONTHLY_FREE_LIMIT,
      aiCreditsRemaining: 3,
    });
    expect(q.remaining).toBe(3);
    expect(q.consume).toBe('credits');
  });

  it('登録 + 月次使い切り + credits 0 → remaining=0, consume=none, mustLink=false (link でなく課金)', () => {
    const q = effectiveQuota({
      isAnonymous: false,
      trialUsedCount: 0,
      monthlyUsedCount: MONTHLY_FREE_LIMIT,
      aiCreditsRemaining: 0,
    });
    expect(q).toEqual({ remaining: 0, mustLink: false, consume: 'none' });
  });

  it('opts で上限を上書きできる', () => {
    const q = effectiveQuota(
      { isAnonymous: true, trialUsedCount: 1, monthlyUsedCount: 0, aiCreditsRemaining: 0 },
      { anonMax: 5 },
    );
    expect(q.remaining).toBe(4);
  });
});

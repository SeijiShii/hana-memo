import { describe, it, expect } from 'vitest';
import { getCurrentSeason, getMonthsBetween, isInSeason } from './season';

describe('getCurrentSeason', () => {
  it('spring (3-5)', () => {
    expect(getCurrentSeason(new Date(2026, 2, 1))).toBe('spring'); // March
    expect(getCurrentSeason(new Date(2026, 4, 15))).toBe('spring'); // May
  });
  it('summer (6-8)', () => {
    expect(getCurrentSeason(new Date(2026, 5, 1))).toBe('summer');
    expect(getCurrentSeason(new Date(2026, 7, 31))).toBe('summer');
  });
  it('autumn (9-11)', () => {
    expect(getCurrentSeason(new Date(2026, 8, 1))).toBe('autumn');
    expect(getCurrentSeason(new Date(2026, 10, 30))).toBe('autumn');
  });
  it('winter (12-2)', () => {
    expect(getCurrentSeason(new Date(2026, 11, 1))).toBe('winter');
    expect(getCurrentSeason(new Date(2026, 0, 15))).toBe('winter');
    expect(getCurrentSeason(new Date(2026, 1, 28))).toBe('winter');
  });
});

describe('getMonthsBetween (UC5 季節レコメンド)', () => {
  it('returns single month for windowDays=0', () => {
    expect(getMonthsBetween(5, 0)).toEqual([5]);
  });

  it('returns 3 months for windowDays=45 (±1)', () => {
    expect(getMonthsBetween(5, 45)).toEqual([4, 5, 6]);
  });

  it('wraps around end of year', () => {
    const months = getMonthsBetween(1, 45); // Jan ±1 = [12, 1, 2]
    expect(months).toContain(1);
    expect(months).toContain(2);
    expect(months).toContain(12);
  });

  it('wraps around start of year', () => {
    const months = getMonthsBetween(12, 45); // Dec ±1 = [11, 12, 1]
    expect(months).toContain(11);
    expect(months).toContain(12);
    expect(months).toContain(1);
  });

  it('throws on invalid targetMonth', () => {
    expect(() => getMonthsBetween(0, 30)).toThrow(TypeError);
    expect(() => getMonthsBetween(13, 30)).toThrow(TypeError);
  });
});

describe('isInSeason', () => {
  it('returns true when current month in seasonMonths', () => {
    const plant = { seasonMonths: [3, 4, 5] };
    expect(isInSeason(plant, new Date(2026, 3, 15))).toBe(true);
  });

  it('returns false when not in season', () => {
    const plant = { seasonMonths: [3, 4, 5] };
    expect(isInSeason(plant, new Date(2026, 10, 15))).toBe(false);
  });

  it('returns false for null seasonMonths', () => {
    expect(isInSeason({ seasonMonths: null }, new Date())).toBe(false);
  });

  it('returns false for empty array', () => {
    expect(isInSeason({ seasonMonths: [] }, new Date())).toBe(false);
  });
});

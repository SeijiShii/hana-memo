import { describe, it, expect } from 'vitest';
import { roundLocation, haversineDistance } from './location';

describe('roundLocation', () => {
  it('rounds to 100m by default', () => {
    const r = roundLocation(35.6812, 139.7671);
    expect(r.precision_m).toBe(100);
    expect(Math.abs(r.lat - 35.6812)).toBeLessThan(0.001);
    expect(Math.abs(r.lng - 139.7671)).toBeLessThan(0.002);
  });

  it('rounds to 1000m when specified', () => {
    const r = roundLocation(35.6812, 139.7671, 1000);
    expect(r.precision_m).toBe(1000);
    // 1km 丸めで 35.681 → 35.68 程度に
    expect(Math.abs(r.lat - 35.68)).toBeLessThan(0.01);
  });

  it('throws on non-positive precision', () => {
    expect(() => roundLocation(35.68, 139.76, 0)).toThrow(TypeError);
    expect(() => roundLocation(35.68, 139.76, -100)).toThrow(TypeError);
  });

  it('throws on non-numeric precision', () => {
    // @ts-expect-error - intentional type violation
    expect(() => roundLocation(35.68, 139.76, 'x')).toThrow(TypeError);
  });

  it('handles equator (cos(0) = 1)', () => {
    const r = roundLocation(0, 0, 100);
    expect(r.precision_m).toBe(100);
    expect(r.lat).toBe(0);
    expect(r.lng).toBe(0);
  });
});

describe('haversineDistance', () => {
  it('returns 0 for same point', () => {
    const p = { lat: 35.6812, lng: 139.7671 };
    expect(haversineDistance(p, p)).toBe(0);
  });

  it('computes Tokyo - Osaka roughly', () => {
    // Tokyo ≈ (35.68, 139.77), Osaka ≈ (34.69, 135.52)
    const tokyo = { lat: 35.6812, lng: 139.7671 };
    const osaka = { lat: 34.6937, lng: 135.5023 };
    const km = haversineDistance(tokyo, osaka) / 1000;
    expect(km).toBeGreaterThan(380); // 実距離 ~395km
    expect(km).toBeLessThan(420);
  });

  it('symmetry', () => {
    const a = { lat: 35.68, lng: 139.77 };
    const b = { lat: 34.69, lng: 135.5 };
    expect(haversineDistance(a, b)).toBeCloseTo(haversineDistance(b, a), 3);
  });
});

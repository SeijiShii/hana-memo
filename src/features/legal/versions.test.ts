/**
 * versions.ts 単体テスト (semver + 再同意判定)
 * 由来: 003_legal_UNIT_TEST.md §1.6 (V01〜V04) + §1.2 (H04〜H06)
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import { compareVersion, parseSemver, needsReConsent, LATEST_VERSIONS } from './versions';

afterEach(() => vi.restoreAllMocks());

describe('compareVersion / parseSemver', () => {
  it('UT-LE-V01: v1.0.0 == v1.0.0 → 0', () => {
    expect(compareVersion('v1.0.0', 'v1.0.0')).toBe(0);
  });
  it('UT-LE-V02: v1.0.0 < v1.1.0 → -1', () => {
    expect(compareVersion('v1.0.0', 'v1.1.0')).toBe(-1);
  });
  it('UT-LE-V03: v1.10.0 > v1.2.0 → 1 (minor を数値比較)', () => {
    expect(compareVersion('v1.10.0', 'v1.2.0')).toBe(1);
  });
  it('UT-LE-V04: 形式不正 → null', () => {
    expect(compareVersion('1.0', 'v1.0.0')).toBeNull();
    expect(parseSemver('beta')).toBeNull();
  });
});

describe('needsReConsent', () => {
  const latest = { privacy_policy: 'v1.1.0', terms_of_service: 'v1.0.0', ai_usage: 'v1.0.0', cookie_policy: null } as const;

  it('UT-LE-H04: 全一致 → needsReConsent=false', () => {
    const r = needsReConsent(
      { privacy_policy: 'v1.1.0', terms_of_service: 'v1.0.0', ai_usage: 'v1.0.0' },
      latest,
    );
    expect(r).toEqual({ needsReConsent: false, diffs: [] });
  });

  it('UT-LE-H05: privacy のみ古い → diffs=[privacy_policy]', () => {
    const r = needsReConsent(
      { privacy_policy: 'v1.0.0', terms_of_service: 'v1.0.0', ai_usage: 'v1.0.0' },
      latest,
    );
    expect(r).toEqual({ needsReConsent: true, diffs: ['privacy_policy'] });
  });

  it('UT-LE-H06: 全 doc 未同意 → diffs 3 件 (cookie_policy=null は除外)', () => {
    const r = needsReConsent({}, latest);
    expect(r.diffs).toEqual(['privacy_policy', 'terms_of_service', 'ai_usage']);
  });

  it('current が新しい → 再同意不要', () => {
    const r = needsReConsent({ privacy_policy: 'v2.0.0', terms_of_service: 'v1.0.0', ai_usage: 'v1.0.0' }, latest);
    expect(r.diffs).not.toContain('privacy_policy');
  });

  it('形式不正 current → 安全側で再同意要 + console.error', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const r = needsReConsent({ privacy_policy: 'bad', terms_of_service: 'v1.0.0', ai_usage: 'v1.0.0' }, latest);
    expect(r.diffs).toContain('privacy_policy');
    expect(spy).toHaveBeenCalled();
  });

  it('デフォルト LATEST_VERSIONS で動作 (cookie_policy=null)', () => {
    expect(LATEST_VERSIONS.cookie_policy).toBeNull();
    expect(needsReConsent({}).diffs).not.toContain('cookie_policy');
  });
});

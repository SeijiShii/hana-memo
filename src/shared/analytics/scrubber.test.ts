/**
 * scrubber.ts 単体テスト ([SEC-004] PII スクラブ、法令対応で 100% カバレッジ必須)
 *
 * 由来: revise_sec_004_sentry_pii_scrub_20260523/003_REVISE_UNIT_TEST.md §1.1 (UT-AN-SCRUB-01〜15)
 */
import { describe, it, expect } from 'vitest';
import { scrub, PII_PATTERNS } from './scrubber';

describe('scrub — PII パターン置換', () => {
  it('UT-AN-SCRUB-01: email を ***@*** に置換', () => {
    expect(scrub('Invalid email: seiji@example.com')).toBe('Invalid email: ***@***');
  });

  it('UT-AN-SCRUB-02: 緯度経度を <coord> に置換', () => {
    expect(scrub('lat=35.6812 lng=139.7671')).toBe('lat=<coord> lng=<coord>');
  });

  it('UT-AN-SCRUB-03: Stripe customer id を <stripe_id> に置換', () => {
    expect(scrub('cus_abc123XYZ failed')).toBe('<stripe_id> failed');
  });

  it('UT-AN-SCRUB-04: Stripe payment intent id を <stripe_id> に置換', () => {
    expect(scrub('pi_xyz789 declined')).toBe('<stripe_id> declined');
  });

  it('UT-AN-SCRUB-05: Clerk session token を <clerk_session> に置換', () => {
    expect(scrub('sess_2abcDEF-123 expired')).toBe('<clerk_session> expired');
  });

  it('UT-AN-SCRUB-06: Clerk user id を <clerk_uid> に置換', () => {
    expect(scrub('user_abcDEF123 created')).toBe('<clerk_uid> created');
  });

  it('UT-AN-SCRUB-07: クレジットカード番号を <card> に置換', () => {
    expect(scrub('4242-4242-4242-4242 declined')).toBe('<card> declined');
  });

  it('UT-AN-SCRUB-08: 日本の電話番号を <phone-jp> に置換', () => {
    expect(scrub('contact 03-1234-5678')).toBe('contact <phone-jp>');
  });

  it('UT-AN-SCRUB-09: null は素通し', () => {
    expect(scrub(null)).toBeNull();
  });

  it('UT-AN-SCRUB-10: undefined は素通し', () => {
    expect(scrub(undefined)).toBeUndefined();
  });

  it('UT-AN-SCRUB-11: number は素通し', () => {
    expect(scrub(42)).toBe(42);
  });

  it('UT-AN-SCRUB-12: nested object を再帰スクラブ (構造保持)', () => {
    expect(
      scrub({ user: { email: 'x@y.com' }, msgs: ['contact 03-1234-5678'] }),
    ).toEqual({ user: { email: '***@***' }, msgs: ['contact <phone-jp>'] });
  });

  it('UT-AN-SCRUB-13: array を再帰スクラブ', () => {
    expect(scrub(['a@b.com', 'c@d.com'])).toEqual(['***@***', '***@***']);
  });

  it('UT-AN-SCRUB-14: 複数パターン同時置換', () => {
    expect(scrub('mixed: x@y.com lat=35.6812 cus_abc')).toBe(
      'mixed: ***@*** lat=<coord> <stripe_id>',
    );
  });

  it('UT-AN-SCRUB-15: 5KB の PII 多含み文字列を < 5ms で処理 (NFR §5.1)', () => {
    const unit = 'err seiji@example.com lat=35.6812 cus_abc123 03-1234-5678; ';
    const big = unit.repeat(Math.ceil(5120 / unit.length));
    const start = performance.now();
    const result = scrub(big);
    const elapsed = performance.now() - start;
    expect(result).not.toContain('seiji@example.com');
    expect(result).not.toContain('cus_abc123');
    expect(elapsed).toBeLessThan(5);
  });
});

describe('scrub — 境界・防御', () => {
  it('boolean は素通し', () => {
    expect(scrub(true)).toBe(true);
  });

  it('Date オブジェクトは破壊せず素通し', () => {
    const d = new Date('2026-05-23T00:00:00Z');
    expect(scrub(d)).toBe(d);
  });

  it('PII を含まない文字列は不変', () => {
    expect(scrub('5 users over 80%, total cost $12.50')).toBe(
      '5 users over 80%, total cost $12.50',
    );
  });

  it('URL クエリ内の email も検出', () => {
    expect(scrub('https://x.com/?u=a@b.com')).toBe('https://x.com/?u=***@***');
  });

  it('PII_PATTERNS は 7 種を公開', () => {
    expect(PII_PATTERNS).toHaveLength(7);
  });
});

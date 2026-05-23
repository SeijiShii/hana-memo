/**
 * note.ts + status.ts 単体テスト
 * 由来: 003_capture_UNIT_TEST.md (UT-CA-E03) + §1.6 (R01/R02)
 */
import { describe, it, expect } from 'vitest';
import { sanitizeUserNote, MAX_USER_NOTE } from './note';
import { canRetry, nextStatusOnRetry, isTerminalStatus } from './status';
import { CaptureError } from './errors';

describe('sanitizeUserNote', () => {
  it('UT-CA-E03: 201 文字 → 200 に trim', () => {
    expect(sanitizeUserNote('あ'.repeat(201))).toHaveLength(MAX_USER_NOTE);
  });
  it('trim + 空は undefined', () => {
    expect(sanitizeUserNote('  memo  ')).toBe('memo');
    expect(sanitizeUserNote('   ')).toBeUndefined();
    expect(sanitizeUserNote(null)).toBeUndefined();
    expect(sanitizeUserNote(undefined)).toBeUndefined();
  });
});

describe('discovery status', () => {
  it('UT-CA-R01: pending → 再識別可能、次は identifying', () => {
    expect(canRetry('pending')).toBe(true);
    expect(nextStatusOnRetry('pending')).toBe('identifying');
  });

  it('UT-CA-R02: identified → 再識別不可 (CaptureError)', () => {
    expect(canRetry('identified')).toBe(false);
    expect(() => nextStatusOnRetry('identified')).toThrow(CaptureError);
  });

  it('isTerminalStatus: identified/unknown は terminal、identifying/pending は非', () => {
    expect(isTerminalStatus('identified')).toBe(true);
    expect(isTerminalStatus('unknown')).toBe(true);
    expect(isTerminalStatus('identifying')).toBe(false);
    expect(isTerminalStatus('pending')).toBe(false);
  });
});

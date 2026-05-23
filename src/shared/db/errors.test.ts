/**
 * errors.ts unit tests
 */
import { describe, it, expect } from 'vitest';
import { DbError, isUniqueViolation, isCheckViolation } from './errors';

describe('DbError', () => {
  it('formats message with code prefix', () => {
    const err = new DbError('E-DB-001', 'DATABASE_URL is missing');
    expect(err.message).toBe('[E-DB-001] DATABASE_URL is missing');
    expect(err.name).toBe('DbError');
    expect(err.code).toBe('E-DB-001');
  });

  it('preserves cause when provided', () => {
    const cause = new Error('underlying');
    const err = new DbError('E-DB-002', 'cold start', cause);
    expect(err.cause).toBe(cause);
  });
});

describe('isUniqueViolation', () => {
  it('returns true for PostgreSQL code 23505', () => {
    expect(isUniqueViolation({ code: '23505' })).toBe(true);
  });

  it('returns false for other codes', () => {
    expect(isUniqueViolation({ code: '23514' })).toBe(false);
    expect(isUniqueViolation({ code: '42P01' })).toBe(false);
  });

  it('returns false for non-object inputs', () => {
    expect(isUniqueViolation(null)).toBe(false);
    expect(isUniqueViolation(undefined)).toBe(false);
    expect(isUniqueViolation('error')).toBe(false);
    expect(isUniqueViolation(42)).toBe(false);
  });

  it('returns false when code is missing', () => {
    expect(isUniqueViolation({ message: 'no code' })).toBe(false);
  });
});

describe('isCheckViolation', () => {
  it('returns true for PostgreSQL code 23514', () => {
    expect(isCheckViolation({ code: '23514' })).toBe(true);
  });

  it('returns false for unique_violation (23505)', () => {
    expect(isCheckViolation({ code: '23505' })).toBe(false);
  });

  it('returns false for non-object inputs', () => {
    expect(isCheckViolation(null)).toBe(false);
    expect(isCheckViolation('error')).toBe(false);
  });
});

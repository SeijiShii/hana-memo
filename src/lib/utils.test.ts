import { describe, it, expect } from 'vitest';
import { cn } from './utils';

describe('cn', () => {
  it('複数 class を結合する', () => {
    expect(cn('a', 'b')).toBe('a b');
  });

  it('falsy / 条件付き class を除外する', () => {
    expect(cn('a', false, null, undefined, 'b')).toBe('a b');
  });

  it('競合する Tailwind utility は後勝ちでマージする', () => {
    expect(cn('px-2', 'px-4')).toBe('px-4');
  });

  it('オブジェクト / 配列形式を受け付ける', () => {
    expect(cn('base', { active: true, hidden: false }, ['x', 'y'])).toBe('base active x y');
  });
});

// 日付ヘルパ (純粋関数、Date API のみ使用、外部 lib 不要)
// 関連: docs/_shared/helpers/001_helpers_SPEC.md §1.1

export type DateFormat = 'yyyy-MM-dd' | 'M月d日' | 'relative';

export function parseISO(s: string): Date {
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) throw new TypeError(`Invalid ISO 8601: ${s}`);
  return d;
}

export function formatDate(d: Date, fmt: DateFormat = 'yyyy-MM-dd'): string {
  if (!(d instanceof Date) || Number.isNaN(d.getTime())) {
    throw new TypeError('formatDate: invalid Date');
  }
  const y = d.getFullYear();
  const m = d.getMonth() + 1;
  const day = d.getDate();
  if (fmt === 'yyyy-MM-dd') {
    return `${y}-${String(m).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  }
  if (fmt === 'M月d日') {
    return `${m}月${day}日`;
  }
  // 'relative'
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffDays = Math.floor(diffMs / 86400000);
  if (diffDays === 0) return '今日';
  if (diffDays === 1) return '昨日';
  if (diffDays < 7) return `${diffDays}日前`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}週間前`;
  if (diffDays < 365) return `${Math.floor(diffDays / 30)}か月前`;
  return `${Math.floor(diffDays / 365)}年前`;
}

export function daysBetween(a: Date, b: Date): number {
  const diff = Math.abs(a.getTime() - b.getTime());
  return Math.floor(diff / 86400000);
}

export function addDays(d: Date, n: number): Date {
  const r = new Date(d.getTime());
  r.setDate(r.getDate() + n);
  return r;
}

export function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

export function endOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999);
}

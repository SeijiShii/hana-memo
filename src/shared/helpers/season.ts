// 季節ヘルパ (北半球 / 日本固定、MVP)
// 関連: docs/_shared/helpers/001_helpers_SPEC.md §1.4, concept §8 [論点-008] (南半球 v2)

export type Season = 'spring' | 'summer' | 'autumn' | 'winter';

/** 日本気象基準: 3-5 春 / 6-8 夏 / 9-11 秋 / 12-2 冬 */
export function getCurrentSeason(d: Date): Season {
  const m = d.getMonth() + 1; // 1-12
  if (m >= 3 && m <= 5) return 'spring';
  if (m >= 6 && m <= 8) return 'summer';
  if (m >= 9 && m <= 11) return 'autumn';
  return 'winter';
}

/**
 * UC5 季節レコメンド: targetMonth ± (windowDays / 30) ヶ月の月リスト
 * 例: targetMonth=5, windowDays=15 → [5] (近い 1 ヶ月)
 *     targetMonth=5, windowDays=45 → [4, 5, 6]
 */
export function getMonthsBetween(targetMonth: number, windowDays: number): number[] {
  if (targetMonth < 1 || targetMonth > 12) {
    throw new TypeError(`targetMonth must be 1-12, got ${targetMonth}`);
  }
  if (windowDays <= 0) return [targetMonth];
  const monthRange = Math.floor(windowDays / 30);
  const months: number[] = [];
  for (let i = -monthRange; i <= monthRange; i++) {
    const m = ((((targetMonth - 1 + i) % 12) + 12) % 12) + 1;
    if (!months.includes(m)) months.push(m);
  }
  return months.sort((a, b) => a - b);
}

/** plants.season_months と現在月の照合 */
export function isInSeason(
  plant: { seasonMonths: number[] | null },
  now: Date,
): boolean {
  if (!plant.seasonMonths || plant.seasonMonths.length === 0) return false;
  const currentMonth = now.getMonth() + 1;
  return plant.seasonMonths.includes(currentMonth);
}

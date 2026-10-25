import { addDays, daysBetween } from './dates';
import { KCAL_PER_KG } from './nutrition';
import type { WeighIn } from './types';

/**
 * Adaptive expenditure in the spirit of MacroFactor: each day, compare what you
 * ate over a trailing window against how fast your weight changed over it.
 * Intake minus stored energy is what you burned. The smoothed trend is for
 * display; the rate comes from a regression over raw weigh-ins.
 * The estimate starts from a formula and is pulled toward the data-implied
 * value as days accumulate.
 */

/** EMA smoothing for the weight trend. */
export const TREND_ALPHA = 0.1;
/** How quickly the estimate moves toward the data-implied value each day. */
export const EXPENDITURE_ALPHA = 0.1;
export const WINDOW_DAYS = 21;
export const MIN_WINDOW_DAYS = 7;
export const MIN_LOGGED_DAYS = 5;
const PLAUSIBLE: [number, number] = [800, 6000];

export interface DayPoint {
  date: string;
  value: number;
}

/** Daily scale weight with gaps linearly interpolated, from the first weigh-in through `through`. */
export function interpolateWeights(weighIns: WeighIn[], through: string): DayPoint[] {
  const sorted = [...weighIns].sort((a, b) => a.date.localeCompare(b.date));
  if (sorted.length === 0) return [];
  const out: DayPoint[] = [];
  for (let i = 0; i < sorted.length; i++) {
    const cur = sorted[i];
    const next = sorted[i + 1];
    if (cur.date > through) break;
    if (!next || next.date > through) {
      const span = daysBetween(cur.date, through);
      for (let d = 0; d <= span; d++) out.push({ date: addDays(cur.date, d), value: cur.kg });
      break;
    }
    const span = daysBetween(cur.date, next.date);
    for (let d = 0; d < span; d++) {
      out.push({ date: addDays(cur.date, d), value: cur.kg + ((next.kg - cur.kg) * d) / span });
    }
  }
  return out;
}

export function weightTrend(weighIns: WeighIn[], through: string): DayPoint[] {
  const daily = interpolateWeights(weighIns, through);
  let trend = daily[0]?.value ?? 0;
  return daily.map((p, i) => {
    trend = i === 0 ? p.value : trend + TREND_ALPHA * (p.value - trend);
    return { date: p.date, value: trend };
  });
}

export interface ExpenditureResult {
  /** Estimate as of the last day, kcal/day. */
  current: number;
  series: DayPoint[];
  trend: DayPoint[];
  /** True once the estimate has been informed by logged data. */
  adaptive: boolean;
}

export const MIN_WEIGH_INS = 4;

/**
 * Least-squares rate of change in kg/day. Unlike the smoothed trend, the
 * regression has no lag, so it tracks a steady loss or gain from the start.
 */
export function slopePerDay(points: { x: number; y: number }[]): number | null {
  if (points.length < MIN_WEIGH_INS) return null;
  const n = points.length;
  const mx = points.reduce((a, p) => a + p.x, 0) / n;
  const my = points.reduce((a, p) => a + p.y, 0) / n;
  let num = 0;
  let den = 0;
  for (const p of points) {
    num += (p.x - mx) * (p.y - my);
    den += (p.x - mx) ** 2;
  }
  return den === 0 ? null : num / den;
}

/**
 * @param intake calories per day for days that were logged; days that are
 *   missing are treated as unknown, not as zero.
 */
export function estimateExpenditure(
  weighIns: WeighIn[],
  intake: Record<string, number>,
  initial: number,
  through: string,
): ExpenditureResult {
  const trend = weightTrend(weighIns, through);
  if (trend.length === 0) {
    return { current: initial, series: [], trend, adaptive: false };
  }

  const scale = [...weighIns].sort((a, b) => a.date.localeCompare(b.date));
  const first = trend[0].date;
  let estimate = initial;
  let adaptive = false;
  const series: DayPoint[] = [{ date: first, value: estimate }];

  for (let i = 1; i < trend.length; i++) {
    const window = Math.min(WINDOW_DAYS, i);
    if (window >= MIN_WINDOW_DAYS) {
      // Intake over the days whose energy shows up in the weight change.
      let total = 0;
      let logged = 0;
      for (let j = i - window; j < i; j++) {
        const kcal = intake[trend[j].date];
        if (kcal != null && kcal > 0) {
          total += kcal;
          logged++;
        }
      }
      const from = trend[i - window].date;
      const to = trend[i].date;
      const points = scale.filter((w) => w.date >= from && w.date <= to).map((w) => ({ x: daysBetween(first, w.date), y: w.kg }));
      const slope = slopePerDay(points);
      if (logged >= MIN_LOGGED_DAYS && slope != null) {
        const implied = total / logged - slope * KCAL_PER_KG;
        const clamped = Math.min(PLAUSIBLE[1], Math.max(PLAUSIBLE[0], implied));
        estimate += EXPENDITURE_ALPHA * (clamped - estimate);
        adaptive = true;
      }
    }
    series.push({ date: trend[i].date, value: estimate });
  }

  return { current: estimate, series, trend, adaptive };
}

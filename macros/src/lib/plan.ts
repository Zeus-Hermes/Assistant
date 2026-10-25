import { addDays, fromDateKey } from './dates';
import { estimateExpenditure, type ExpenditureResult } from './expenditure';
import { computeTargets, initialExpenditure, sumNutrients } from './nutrition';
import type { Goal, LogEntry, Nutrients, Profile, Targets, WeighIn } from './types';

export function intakeByDay(entries: LogEntry[]): Record<string, number> {
  const out: Record<string, number> = {};
  for (const e of entries) out[e.date] = (out[e.date] ?? 0) + e.nutrients.calories;
  return out;
}

export function totalsForDay(entries: LogEntry[], date: string): Nutrients {
  return sumNutrients(entries.filter((e) => e.date === date).map((e) => e.nutrients));
}

/** Targets are refreshed once a week, like a check-in. 1 = Monday. */
export const CHECK_IN_WEEKDAY = 1;

export function checkInDateFor(date: string): string {
  const dow = fromDateKey(date).getDay();
  return addDays(date, -((dow - CHECK_IN_WEEKDAY + 7) % 7));
}

function firstWeighInKg(weighIns: WeighIn[]): number | undefined {
  return [...weighIns].sort((a, b) => a.date.localeCompare(b.date))[0]?.kg;
}

export interface Plan {
  expenditure: ExpenditureResult;
  /** Expenditure the current week's targets were set from. */
  checkInExpenditure: number;
  /** False until the check-in estimate has been informed by logged data. */
  checkInAdaptive: boolean;
  checkInDate: string;
  weightKg: number;
  targets: Targets;
}

export function planFor(input: { profile: Profile; goal: Goal; entries: LogEntry[]; weighIns: WeighIn[] }, date: string): Plan | null {
  const { profile, goal, entries, weighIns } = input;
  const startKg = firstWeighInKg(weighIns);
  if (startKg == null) return null;
  const initial = initialExpenditure(profile, startKg);
  const intake = intakeByDay(entries);
  const expenditure = estimateExpenditure(weighIns, intake, initial, date);

  const checkInDate = checkInDateFor(date);
  // Use the estimate going into the check-in day; the current week's targets stay fixed.
  const atCheckIn = estimateExpenditure(weighIns, intake, initial, addDays(checkInDate, -1));
  const checkInExpenditure = atCheckIn.series.length ? atCheckIn.current : initial;
  const weightKg = (atCheckIn.trend.at(-1) ?? expenditure.trend.at(-1))?.value ?? startKg;

  return {
    expenditure,
    checkInExpenditure,
    checkInAdaptive: atCheckIn.adaptive,
    checkInDate,
    weightKg,
    targets: computeTargets(checkInExpenditure, weightKg, goal),
  };
}

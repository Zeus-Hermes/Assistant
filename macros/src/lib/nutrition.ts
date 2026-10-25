import type { Food, Goal, Nutrients, Profile, Serving, Targets } from './types';

/** Energy content of one kg of body mass change, in kcal. */
export const KCAL_PER_KG = 7700;

export const ZERO: Nutrients = { calories: 0, protein: 0, carbs: 0, fat: 0 };

const OPTIONAL_KEYS = ['fiber', 'sugar', 'sodium'] as const;

export function scaleNutrients(n: Nutrients, factor: number): Nutrients {
  const out: Nutrients = {
    calories: n.calories * factor,
    protein: n.protein * factor,
    carbs: n.carbs * factor,
    fat: n.fat * factor,
  };
  for (const k of OPTIONAL_KEYS) {
    if (n[k] != null) out[k] = n[k]! * factor;
  }
  return out;
}

export function sumNutrients(list: Nutrients[]): Nutrients {
  const out: Nutrients = { ...ZERO };
  for (const n of list) {
    out.calories += n.calories;
    out.protein += n.protein;
    out.carbs += n.carbs;
    out.fat += n.fat;
    for (const k of OPTIONAL_KEYS) {
      if (n[k] != null) out[k] = (out[k] ?? 0) + n[k]!;
    }
  }
  return out;
}

/** Nutrients for `quantity` of `serving` of `food`. */
export function nutrientsFor(food: Food, serving: Serving, quantity: number): Nutrients {
  return scaleNutrients(food.nutrients, (serving.amount * quantity) / food.base.amount);
}

/** True for the bare "g"/"ml" serving, where quantity is a weight or volume rather than a count. */
export function isUnitServing(s: Serving): boolean {
  return s.amount === 1 && (s.label === 'g' || s.label === 'ml');
}

/** Calories implied by macros (4/4/9). */
export function caloriesFromMacros(protein: number, carbs: number, fat: number): number {
  return protein * 4 + carbs * 4 + fat * 9;
}

export function ageFromBirthYear(birthYear: number, now = new Date()): number {
  return now.getFullYear() - birthYear;
}

/** Mifflin–St Jeor basal metabolic rate. */
export function bmr(profile: Profile, weightKg: number, now = new Date()): number {
  const age = ageFromBirthYear(profile.birthYear, now);
  const base = 10 * weightKg + 6.25 * profile.heightCm - 5 * age;
  return profile.sex === 'male' ? base + 5 : base - 161;
}

export function initialExpenditure(profile: Profile, weightKg: number, now = new Date()): number {
  return bmr(profile, weightKg, now) * profile.activity;
}

/** Signed daily energy balance the goal asks for (negative = deficit). */
export function dailyGoalDelta(goal: Goal): number {
  if (goal.type === 'maintain') return 0;
  const perDay = (goal.rateKgPerWeek * KCAL_PER_KG) / 7;
  return goal.type === 'lose' ? -perDay : perDay;
}

export const MIN_CALORIES = 1200;

export function computeTargets(expenditure: number, weightKg: number, goal: Goal): Targets {
  const calories = Math.max(MIN_CALORIES, Math.round(expenditure + dailyGoalDelta(goal)));
  const protein = Math.round(goal.proteinPerKg * weightKg);
  const fat = Math.round((calories * goal.fatShare) / 9);
  const carbs = Math.max(0, Math.round((calories - protein * 4 - fat * 9) / 4));
  return { calories, protein, carbs, fat };
}

export function round(n: number, digits = 0): number {
  const f = 10 ** digits;
  return Math.round(n * f) / f;
}

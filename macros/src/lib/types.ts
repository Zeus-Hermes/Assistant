export interface Nutrients {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber?: number;
  sugar?: number;
  /** milligrams */
  sodium?: number;
}

export type FoodSource = 'off' | 'usda' | 'custom';

/** A selectable portion, expressed in the food's base unit. */
export interface Serving {
  label: string;
  amount: number;
}

export interface Food {
  /** Stable id, prefixed by source: `off:<barcode>`, `usda:<fdcId>`, `custom:<uuid>`. */
  id: string;
  source: FoodSource;
  name: string;
  brand?: string;
  barcode?: string;
  /** Nutrients per `base.amount` of `base.unit`. */
  base: { unit: 'g' | 'ml' | 'serving'; amount: number };
  nutrients: Nutrients;
  servings: Serving[];
  /** On recent foods only: the portion logged last time, offered first next time. */
  last?: { serving: Serving; quantity: number };
}

/** Hour of the day (0–23) an entry sits at on the food log timeline. */
export type Hour = number;

export function hourLabel(h: Hour): string {
  const suffix = h < 12 ? 'AM' : 'PM';
  const n = h % 12 === 0 ? 12 : h % 12;
  return `${n} ${suffix}`;
}

/** Where meal-based entries from older versions land on the timeline. */
export const LEGACY_MEAL_HOUR: Record<string, Hour> = { breakfast: 8, lunch: 12, dinner: 18, snacks: 15 };

export interface LogEntry {
  id: string;
  /** Local calendar day, YYYY-MM-DD. */
  date: string;
  hour: Hour;
  name: string;
  /** Totals for this entry, computed when logged. */
  nutrients: Nutrients;
  createdAt: number;
  /** Present for database/custom foods; absent for quick adds. */
  food?: Food;
  serving?: Serving;
  quantity?: number;
}

export interface WeighIn {
  date: string;
  kg: number;
}

export type Sex = 'male' | 'female';
export type UnitSystem = 'imperial' | 'metric';
export type GoalType = 'lose' | 'maintain' | 'gain';

export interface Profile {
  sex: Sex;
  birthYear: number;
  heightCm: number;
  /** Multiplier on BMR used only for the starting expenditure estimate. */
  activity: number;
  units: UnitSystem;
}

export interface Goal {
  type: GoalType;
  /** Absolute weekly rate in kg; direction comes from `type`. */
  rateKgPerWeek: number;
  /** Grams of protein per kg of bodyweight. */
  proteinPerKg: number;
  /** Share of calories from fat, 0–1. */
  fatShare: number;
}

export interface Targets {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

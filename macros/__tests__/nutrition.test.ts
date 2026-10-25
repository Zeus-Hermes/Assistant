import { addDays } from '@/lib/dates';
import { estimateExpenditure, interpolateWeights, weightTrend } from '@/lib/expenditure';
import { KCAL_PER_KG, bmr, computeTargets, dailyGoalDelta, isUnitServing, nutrientsFor, sumNutrients } from '@/lib/nutrition';
import { checkInDateFor, planFor } from '@/lib/plan';
import type { Food, Goal, LogEntry, Profile } from '@/lib/types';

const profile: Profile = { sex: 'male', birthYear: 1996, heightCm: 180, activity: 1.5, units: 'imperial' };
const goal: Goal = { type: 'lose', rateKgPerWeek: 0.5, proteinPerKg: 2, fatShare: 0.25 };

describe('nutrition math', () => {
  test('Mifflin-St Jeor BMR', () => {
    // 10*80 + 6.25*180 - 5*30 + 5 = 1780
    expect(bmr(profile, 80, new Date(2026, 5, 1))).toBeCloseTo(1780);
    expect(bmr({ ...profile, sex: 'female' }, 80, new Date(2026, 5, 1))).toBeCloseTo(1614);
  });

  test('scales per-100g food by serving and quantity', () => {
    const food: Food = {
      id: 'x',
      source: 'usda',
      name: 'Rice',
      base: { unit: 'g', amount: 100 },
      nutrients: { calories: 130, protein: 2.7, carbs: 28, fat: 0.3, fiber: 0.4 },
      servings: [{ label: '1 cup (158 g)', amount: 158 }],
    };
    const n = nutrientsFor(food, food.servings[0], 2);
    expect(n.calories).toBeCloseTo(410.8);
    expect(n.carbs).toBeCloseTo(88.48);
    expect(n.fiber).toBeCloseTo(1.264);
    expect(n.sodium).toBeUndefined();
  });

  test('sums nutrients including optional fields', () => {
    const s = sumNutrients([
      { calories: 100, protein: 10, carbs: 5, fat: 2, fiber: 1 },
      { calories: 50, protein: 0, carbs: 10, fat: 1 },
    ]);
    expect(s).toEqual({ calories: 150, protein: 10, carbs: 15, fat: 3, fiber: 1 });
  });

  test('targets: deficit, protein per kg, fat share, carbs remainder', () => {
    expect(dailyGoalDelta(goal)).toBeCloseTo(-550);
    const t = computeTargets(2600, 80, goal);
    expect(t.calories).toBe(2050);
    expect(t.protein).toBe(160);
    expect(t.fat).toBe(57);
    expect(t.carbs).toBe(Math.round((2050 - 160 * 4 - 57 * 9) / 4));
    expect(computeTargets(1300, 80, goal).calories).toBe(1200);
    expect(dailyGoalDelta({ ...goal, type: 'maintain' })).toBe(0);
  });
});

describe('weight trend', () => {
  test('interpolates gaps and carries the last weigh-in forward', () => {
    const pts = interpolateWeights(
      [
        { date: '2026-01-01', kg: 80 },
        { date: '2026-01-05', kg: 78 },
      ],
      '2026-01-07',
    );
    expect(pts.map((p) => p.value)).toEqual([80, 79.5, 79, 78.5, 78, 78, 78]);
  });

  test('trend smooths noise', () => {
    const noisy = Array.from({ length: 30 }, (_, i) => ({
      date: addDays('2026-01-01', i),
      kg: 80 + (i % 2 === 0 ? 1 : -1),
    }));
    const t = weightTrend(noisy, '2026-01-30');
    const last = t.at(-1)!.value;
    expect(Math.abs(last - 80)).toBeLessThan(0.3);
  });
});

describe('adaptive expenditure', () => {
  /** Simulate someone with true TDEE `tdee` eating `eat` kcal/day for `days`. */
  function simulate(tdee: number, eat: number, days: number, startKg = 90) {
    const weighIns = [];
    const intake: Record<string, number> = {};
    let kg = startKg;
    for (let i = 0; i < days; i++) {
      const date = addDays('2026-01-01', i);
      weighIns.push({ date, kg });
      intake[date] = eat;
      kg += (eat - tdee) / KCAL_PER_KG;
    }
    return { weighIns, intake, last: addDays('2026-01-01', days - 1) };
  }

  test('converges from a wrong initial guess to the true expenditure', () => {
    const { weighIns, intake, last } = simulate(2800, 2200, 90);
    const r = estimateExpenditure(weighIns, intake, 2200, last);
    expect(r.adaptive).toBe(true);
    expect(Math.abs(r.current - 2800)).toBeLessThan(120);
  });

  test('converges within six weeks despite noisy weigh-ins and intake', () => {
    let seed = 11;
    const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647) * 2 - 1;
    const weighIns = [];
    const intake: Record<string, number> = {};
    let kg = 86;
    for (let i = 0; i < 42; i++) {
      const date = addDays('2026-01-01', i);
      weighIns.push({ date, kg: kg + rand() * 0.6 });
      const eaten = 2150 + rand() * 250;
      intake[date] = eaten;
      kg += (eaten - 2700) / KCAL_PER_KG;
    }
    const r = estimateExpenditure(weighIns, intake, 2300, addDays('2026-01-01', 41));
    expect(Math.abs(r.current - 2700)).toBeLessThan(150);
  });

  test('stays at the initial estimate with no logged food', () => {
    const { weighIns, last } = simulate(2800, 2200, 30);
    const r = estimateExpenditure(weighIns, {}, 2500, last);
    expect(r.adaptive).toBe(false);
    expect(r.current).toBe(2500);
  });

  test('ignores unlogged days rather than counting them as zero', () => {
    const { weighIns, intake, last } = simulate(2600, 2600, 60);
    // Drop every third day of logging.
    for (const k of Object.keys(intake).filter((_, i) => i % 3 === 0)) delete intake[k];
    const r = estimateExpenditure(weighIns, intake, 2600, last);
    expect(Math.abs(r.current - 2600)).toBeLessThan(60);
  });
});

describe('weekly plan', () => {
  test('check-in date is the Monday on or before the date', () => {
    expect(checkInDateFor('2026-10-25')).toBe('2026-10-19'); // Sunday
    expect(checkInDateFor('2026-10-19')).toBe('2026-10-19'); // Monday
  });

  test('plan targets come from the formula before any data', () => {
    const plan = planFor({ profile, goal, entries: [], weighIns: [{ date: '2026-10-20', kg: 80 }] }, '2026-10-25')!;
    expect(plan.targets.protein).toBe(160);
    expect(plan.targets.calories).toBeGreaterThan(1200);
  });

  test('no plan without a weigh-in', () => {
    expect(planFor({ profile, goal, entries: [], weighIns: [] }, '2026-10-25')).toBeNull();
  });

  test('targets do not change mid-week', () => {
    const weighIns = Array.from({ length: 40 }, (_, i) => ({ date: addDays('2026-09-01', i), kg: 85 - i * 0.05 }));
    const entries: LogEntry[] = weighIns.map((w, i) => ({
      id: String(i),
      date: w.date,
      meal: 'lunch',
      name: 'Food',
      nutrients: { calories: 2300, protein: 150, carbs: 200, fat: 80 },
      createdAt: i,
    }));
    const a = planFor({ profile, goal, entries, weighIns }, '2026-10-06')!; // Tuesday
    const b = planFor({ profile, goal, entries, weighIns }, '2026-10-10')!; // Saturday
    expect(a.checkInDate).toBe(b.checkInDate);
    expect(a.targets).toEqual(b.targets);
  });
});

describe('servings', () => {
  test('only bare g/ml servings count as weight units', () => {
    expect(isUnitServing({ label: 'g', amount: 1 })).toBe(true);
    expect(isUnitServing({ label: 'ml', amount: 1 })).toBe(true);
    // A custom food's single serving also has amount 1 but is a count.
    expect(isUnitServing({ label: '1 serving', amount: 1 })).toBe(false);
    expect(isUnitServing({ label: '1 cup (140 g)', amount: 140 })).toBe(false);
  });
});

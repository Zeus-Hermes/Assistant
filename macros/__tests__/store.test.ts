import { parseBackup, serializeBackup } from '@/lib/backup';
import type { Food } from '@/lib/types';
import { migrateEntry, pickData, useStore } from '@/store/useStore';

jest.mock('@react-native-async-storage/async-storage', () => require('@react-native-async-storage/async-storage/jest/async-storage-mock'));

const oats: Food = {
  id: 'usda:1',
  source: 'usda',
  name: 'Oats',
  base: { unit: 'g', amount: 100 },
  nutrients: { calories: 380, protein: 13, carbs: 67, fat: 7 },
  servings: [
    { label: '1/2 cup (40 g)', amount: 40 },
    { label: 'g', amount: 1 },
  ],
};

beforeEach(() => useStore.getState().reset());

test('logging a food computes nutrients and records it as recent', () => {
  const e = useStore.getState().logFood({ date: '2026-10-25', hour: 8, food: oats, serving: oats.servings[0], quantity: 1.5 });
  expect(e.nutrients.calories).toBeCloseTo(228);
  expect(useStore.getState().recentFoods[0].id).toBe('usda:1');
});

test('editing quantity recomputes nutrients', () => {
  const e = useStore.getState().logFood({ date: '2026-10-25', hour: 8, food: oats, serving: oats.servings[1], quantity: 100 });
  useStore.getState().updateEntry(e.id, { quantity: 50 });
  expect(useStore.getState().entries[0].nutrients.calories).toBeCloseTo(190);
});

test('quick add, copy day and delete', () => {
  const s = useStore.getState();
  s.quickAdd({ date: '2026-10-24', hour: 15, nutrients: { calories: 250, protein: 20, carbs: 10, fat: 12 } });
  s.copyDay('2026-10-24', '2026-10-25');
  const entries = useStore.getState().entries;
  expect(entries.map((e) => e.date)).toEqual(['2026-10-24', '2026-10-25']);
  expect(entries[1].name).toBe('Quick add');
  expect(entries[0].id).not.toBe(entries[1].id);
  useStore.getState().deleteEntry(entries[0].id);
  expect(useStore.getState().entries).toHaveLength(1);
});

test('one weigh-in per day, kept sorted', () => {
  const s = useStore.getState();
  s.logWeight({ date: '2026-10-25', kg: 80 });
  s.logWeight({ date: '2026-10-23', kg: 81 });
  s.logWeight({ date: '2026-10-25', kg: 79.5 });
  expect(useStore.getState().weighIns).toEqual([
    { date: '2026-10-23', kg: 81 },
    { date: '2026-10-25', kg: 79.5 },
  ]);
});

test('backup round-trips and rejects junk', () => {
  const s = useStore.getState();
  s.logFood({ date: '2026-10-25', hour: 12, food: oats, serving: oats.servings[0], quantity: 1 });
  s.logWeight({ date: '2026-10-25', kg: 80 });
  const text = serializeBackup(pickData(useStore.getState()));
  s.reset();
  useStore.getState().replaceAll(parseBackup(text));
  expect(useStore.getState().entries).toHaveLength(1);
  expect(useStore.getState().weighIns[0].kg).toBe(80);

  expect(() => parseBackup('nope')).toThrow(/not valid JSON/);
  expect(() => parseBackup('{"format":"other"}')).toThrow(/not a Macros backup/);
  expect(() =>
    parseBackup(JSON.stringify({ format: 'macros-backup', version: 1, data: { goal: {}, weighIns: [{ date: 'x', kg: 1 }] } })),
  ).toThrow(/weigh-in/);
});

test('recent foods remember the last portion; log entries do not carry it', () => {
  const s = useStore.getState();
  s.logFood({ date: '2026-10-25', hour: 8, food: oats, serving: oats.servings[1], quantity: 57.5 });
  const recent = useStore.getState().recentFoods[0];
  expect(recent.last).toEqual({ serving: { label: 'g', amount: 1 }, quantity: 57.5 });
  // Logging a recent food again must not copy `last` into the entry.
  useStore.getState().logFood({ date: '2026-10-25', hour: 9, food: recent, serving: oats.servings[0], quantity: 1 });
  expect(useStore.getState().entries[1].food?.last).toBeUndefined();
  expect(useStore.getState().recentFoods[0].last?.quantity).toBe(1);
});

test('v1 meal-based entries move onto the hourly timeline', () => {
  const v1 = {
    id: 'a',
    date: '2026-10-01',
    meal: 'dinner',
    name: 'Pasta',
    nutrients: { calories: 600, protein: 20, carbs: 90, fat: 15 },
    createdAt: 1,
  };
  const migrated = migrateEntry(v1 as never);
  expect(migrated.hour).toBe(18);
  expect('meal' in migrated).toBe(false);
  const fromBackup = parseBackup(JSON.stringify({ format: 'macros-backup', version: 1, data: { goal: {}, entries: [v1] } }));
  expect(fromBackup.entries[0].hour).toBe(18);
});

import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { uid } from '@/lib/id';
import {
  LEGACY_MEAL_HOUR,
  type Food,
  type Goal,
  type Hour,
  type LogEntry,
  type Nutrients,
  type Profile,
  type Serving,
  type WeighIn,
} from '@/lib/types';
import { nutrientsFor } from '@/lib/nutrition';

export const DEFAULT_GOAL: Goal = {
  type: 'lose',
  rateKgPerWeek: 0.45,
  proteinPerKg: 2.0,
  fatShare: 0.27,
};

const RECENT_LIMIT = 60;

export interface PersistedData {
  profile: Profile | null;
  goal: Goal;
  entries: LogEntry[];
  weighIns: WeighIn[];
  customFoods: Food[];
  recentFoods: Food[];
  usdaApiKey: string;
}

interface Actions {
  completeOnboarding(profile: Profile, goal: Goal, weighIn: WeighIn): void;
  updateProfile(patch: Partial<Profile>): void;
  updateGoal(patch: Partial<Goal>): void;
  logFood(input: { date: string; hour: Hour; food: Food; serving: Serving; quantity: number }): LogEntry;
  quickAdd(input: { date: string; hour: Hour; name?: string; nutrients: Nutrients }): LogEntry;
  updateEntry(id: string, patch: { serving?: Serving; quantity?: number; hour?: Hour; nutrients?: Nutrients; name?: string }): void;
  deleteEntry(id: string): void;
  copyDay(from: string, to: string): void;
  logWeight(w: WeighIn): void;
  deleteWeight(date: string): void;
  saveCustomFood(food: Food): void;
  deleteCustomFood(id: string): void;
  setUsdaApiKey(key: string): void;
  replaceAll(data: PersistedData): void;
  reset(): void;
}

export type State = PersistedData & Actions;

const initial: PersistedData = {
  profile: null,
  goal: DEFAULT_GOAL,
  entries: [],
  weighIns: [],
  customFoods: [],
  recentFoods: [],
  usdaApiKey: '',
};

function pushRecent(list: Food[], food: Food, serving: Serving, quantity: number): Food[] {
  return [{ ...food, last: { serving, quantity } }, ...list.filter((f) => f.id !== food.id)].slice(0, RECENT_LIMIT);
}

export const useStore = create<State>()(
  persist(
    (set, get) => ({
      ...initial,

      completeOnboarding(profile, goal, weighIn) {
        set((s) => ({
          profile,
          goal,
          weighIns: [...s.weighIns.filter((w) => w.date !== weighIn.date), weighIn],
        }));
      },

      updateProfile(patch) {
        const p = get().profile;
        if (p) set({ profile: { ...p, ...patch } });
      },

      updateGoal(patch) {
        set((s) => ({ goal: { ...s.goal, ...patch } }));
      },

      logFood({ date, hour, food: picked, serving, quantity }) {
        // The remembered portion belongs on the recent list, not inside log entries.
        const food: Food = { ...picked };
        delete food.last;
        const entry: LogEntry = {
          id: uid(),
          date,
          hour,
          name: food.name,
          food,
          serving,
          quantity,
          nutrients: nutrientsFor(food, serving, quantity),
          createdAt: Date.now(),
        };
        set((s) => ({ entries: [...s.entries, entry], recentFoods: pushRecent(s.recentFoods, food, serving, quantity) }));
        return entry;
      },

      quickAdd({ date, hour, name, nutrients }) {
        const entry: LogEntry = {
          id: uid(),
          date,
          hour,
          name: name?.trim() || 'Quick add',
          nutrients,
          createdAt: Date.now(),
        };
        set((s) => ({ entries: [...s.entries, entry] }));
        return entry;
      },

      updateEntry(id, patch) {
        set((s) => ({
          entries: s.entries.map((e) => {
            if (e.id !== id) return e;
            const next: LogEntry = { ...e, ...patch };
            if (e.food && (patch.serving || patch.quantity != null)) {
              next.nutrients = nutrientsFor(e.food, next.serving!, next.quantity!);
            }
            return next;
          }),
        }));
      },

      deleteEntry(id) {
        set((s) => ({ entries: s.entries.filter((e) => e.id !== id) }));
      },

      copyDay(from, to) {
        const now = Date.now();
        set((s) => ({
          entries: [
            ...s.entries,
            ...s.entries.filter((e) => e.date === from).map((e, i) => ({ ...e, id: uid(), date: to, createdAt: now + i })),
          ],
        }));
      },

      logWeight(w) {
        set((s) => ({ weighIns: [...s.weighIns.filter((x) => x.date !== w.date), w].sort((a, b) => a.date.localeCompare(b.date)) }));
      },

      deleteWeight(date) {
        set((s) => ({ weighIns: s.weighIns.filter((w) => w.date !== date) }));
      },

      saveCustomFood(food) {
        set((s) => ({ customFoods: [food, ...s.customFoods.filter((f) => f.id !== food.id)] }));
      },

      deleteCustomFood(id) {
        set((s) => ({
          customFoods: s.customFoods.filter((f) => f.id !== id),
          recentFoods: s.recentFoods.filter((f) => f.id !== id),
        }));
      },

      setUsdaApiKey(key) {
        set({ usdaApiKey: key.trim() });
      },

      replaceAll(data) {
        set({ ...initial, ...data });
      },

      reset() {
        set(initial);
      },
    }),
    {
      name: 'macros-store',
      version: 2,
      storage: createJSONStorage(() => AsyncStorage),
      migrate: (persisted, version) => {
        const data = persisted as PersistedData;
        if (version < 2 && data?.entries) data.entries = data.entries.map(migrateEntry);
        return data;
      },
      partialize: ({ profile, goal, entries, weighIns, customFoods, recentFoods, usdaApiKey }) => ({
        profile,
        goal,
        entries,
        weighIns,
        customFoods,
        recentFoods,
        usdaApiKey,
      }),
    },
  ),
);

/** v1 entries were grouped by meal; v2 places them on the hourly timeline. */
export function migrateEntry(e: LogEntry & { meal?: string }): LogEntry {
  if (typeof e.hour === 'number') return e;
  const { meal, ...rest } = e;
  return { ...rest, hour: LEGACY_MEAL_HOUR[meal ?? ''] ?? 12 };
}

export function pickData(s: State): PersistedData {
  const { profile, goal, entries, weighIns, customFoods, recentFoods, usdaApiKey } = s;
  return { profile, goal, entries, weighIns, customFoods, recentFoods, usdaApiKey };
}

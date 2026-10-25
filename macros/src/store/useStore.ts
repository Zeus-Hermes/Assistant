import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { uid } from '@/lib/id';
import type { Food, Goal, LogEntry, Meal, Nutrients, Profile, Serving, WeighIn } from '@/lib/types';
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
  logFood(input: { date: string; meal: Meal; food: Food; serving: Serving; quantity: number }): LogEntry;
  quickAdd(input: { date: string; meal: Meal; name?: string; nutrients: Nutrients }): LogEntry;
  updateEntry(id: string, patch: { serving?: Serving; quantity?: number; meal?: Meal; nutrients?: Nutrients; name?: string }): void;
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

function pushRecent(list: Food[], food: Food): Food[] {
  return [food, ...list.filter((f) => f.id !== food.id)].slice(0, RECENT_LIMIT);
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

      logFood({ date, meal, food, serving, quantity }) {
        const entry: LogEntry = {
          id: uid(),
          date,
          meal,
          name: food.name,
          food,
          serving,
          quantity,
          nutrients: nutrientsFor(food, serving, quantity),
          createdAt: Date.now(),
        };
        set((s) => ({ entries: [...s.entries, entry], recentFoods: pushRecent(s.recentFoods, food) }));
        return entry;
      },

      quickAdd({ date, meal, name, nutrients }) {
        const entry: LogEntry = {
          id: uid(),
          date,
          meal,
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
      version: 1,
      storage: createJSONStorage(() => AsyncStorage),
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

export function pickData(s: State): PersistedData {
  const { profile, goal, entries, weighIns, customFoods, recentFoods, usdaApiKey } = s;
  return { profile, goal, entries, weighIns, customFoods, recentFoods, usdaApiKey };
}

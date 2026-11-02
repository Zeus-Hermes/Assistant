import { create } from 'zustand';

import { uid } from '@/lib/id';
import { nutrientsFor, sumNutrients } from '@/lib/nutrition';
import type { Food, Hour, Nutrients, Serving } from '@/lib/types';

import { useStore } from './useStore';

/** A food waiting in the add-food sheet until "Log Foods" is tapped. */
export interface CartItem {
  key: string;
  name: string;
  nutrients: Nutrients;
  food?: Food;
  serving?: Serving;
  quantity?: number;
}

interface Cart {
  date: string;
  hour: Hour;
  items: CartItem[];
  open(date: string, hour: Hour): void;
  setHour(hour: Hour): void;
  addFood(food: Food, serving: Serving, quantity: number): void;
  addQuick(name: string, nutrients: Nutrients): void;
  remove(key: string): void;
  /** Writes every item to the log at the cart's date and hour, then empties it. */
  commit(): number;
}

export const useCart = create<Cart>((set, get) => ({
  date: '',
  hour: 12,
  items: [],
  open(date, hour) {
    set({ date, hour, items: [] });
  },
  setHour(hour) {
    set({ hour });
  },
  addFood(food, serving, quantity) {
    const item: CartItem = { key: uid(), name: food.name, food, serving, quantity, nutrients: nutrientsFor(food, serving, quantity) };
    set((s) => ({ items: [...s.items, item] }));
  },
  addQuick(name, nutrients) {
    set((s) => ({ items: [...s.items, { key: uid(), name: name.trim() || 'Quick add', nutrients }] }));
  },
  remove(key) {
    set((s) => ({ items: s.items.filter((i) => i.key !== key) }));
  },
  commit() {
    const { date, hour, items } = get();
    const store = useStore.getState();
    for (const i of items) {
      if (i.food && i.serving && i.quantity != null) store.logFood({ date, hour, food: i.food, serving: i.serving, quantity: i.quantity });
      else store.quickAdd({ date, hour, name: i.name, nutrients: i.nutrients });
    }
    set({ items: [] });
    return items.length;
  },
}));

export function cartTotals(items: CartItem[]): Nutrients {
  return sumNutrients(items.map((i) => i.nutrients));
}

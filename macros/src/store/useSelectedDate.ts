import { create } from 'zustand';

import { today } from '@/lib/dates';

/** The day the dashboard and log are looking at; shared so both tabs stay in sync. */
export const useSelectedDate = create<{ date: string; setDate: (d: string) => void }>((set) => ({
  date: today(),
  setDate: (date) => set({ date }),
}));

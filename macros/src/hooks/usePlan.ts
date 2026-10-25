import { useMemo } from 'react';

import { planFor, type Plan } from '@/lib/plan';
import { useStore } from '@/store/useStore';

export function usePlan(date: string): Plan | null {
  const profile = useStore((s) => s.profile);
  const goal = useStore((s) => s.goal);
  const entries = useStore((s) => s.entries);
  const weighIns = useStore((s) => s.weighIns);
  return useMemo(() => (profile ? planFor({ profile, goal, entries, weighIns }, date) : null), [profile, goal, entries, weighIns, date]);
}

import { isUnitServing } from './nutrition';
import type { Serving } from './types';

const trim = (n: number) => Math.round(n * 100) / 100;

/** "57.5 g", "1 cup (140 g)", "2 × 1 container (170 g)"; empty for quick adds. */
export function amountLabel(serving: Serving | undefined, quantity: number | undefined): string {
  if (!serving || quantity == null) return '';
  const q = trim(quantity);
  if (isUnitServing(serving)) return `${q} ${serving.label}`;
  if (q === 1) return serving.label;
  return `${q} × ${serving.label}`;
}

export function formatKcal(n: number): string {
  return String(Math.round(n));
}

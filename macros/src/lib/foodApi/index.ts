import type { Food } from '../types';
import { lookupOpenFoodFactsBarcode, searchOpenFoodFacts } from './openFoodFacts';
import { lookupUsdaBarcode, searchUsda } from './usda';

export interface SearchOutcome {
  foods: Food[];
  /** Per-source errors; a search still succeeds if one source answers. */
  errors: string[];
}

function tokens(s: string): string[] {
  return s
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(Boolean);
}

/** Higher is better: rewards names covering the query, short names, generic foods. */
export function relevance(food: Food, query: string): number {
  const q = tokens(query);
  if (q.length === 0) return 0;
  const name = tokens(food.name);
  const brand = tokens(food.brand ?? '');
  let score = 0;
  for (const t of q) {
    if (name.includes(t)) score += 3;
    else if (name.some((n) => n.startsWith(t))) score += 2;
    else if (brand.includes(t)) score += 1;
  }
  if (name[0] && name[0] === q[0]) score += 1.5;
  score -= Math.max(0, name.length - q.length) * 0.25;
  if (food.source === 'usda' && !food.brand) score += 1;
  return score;
}

/** Turns fetch failures into something a person can act on. */
export function describeError(e: unknown): string {
  const msg = String((e as Error)?.message ?? e);
  if (/failed to fetch|network request failed|load failed|networkerror/i.test(msg)) return "couldn't connect";
  return msg;
}

function dedupe(foods: Food[]): Food[] {
  const seen = new Set<string>();
  const out: Food[] = [];
  for (const f of foods) {
    const key = f.barcode ? `bc:${f.barcode.replace(/^0+/, '')}` : `${f.name.toLowerCase()}|${(f.brand ?? '').toLowerCase()}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(f);
  }
  return out;
}

export async function searchFoods(
  query: string,
  opts: { usdaApiKey?: string; signal?: AbortSignal; fetchImpl?: typeof fetch; local?: Food[] } = {},
): Promise<SearchOutcome> {
  const q = query.trim();
  if (!q) return { foods: [], errors: [] };
  const [off, usda] = await Promise.allSettled([searchOpenFoodFacts(q, opts), searchUsda(q, { ...opts, apiKey: opts.usdaApiKey })]);
  const errors: string[] = [];
  const remote: Food[] = [];
  for (const [label, r] of [
    ['USDA', usda],
    ['Open Food Facts', off],
  ] as const) {
    if (r.status === 'fulfilled') remote.push(...r.value);
    else if ((r.reason as Error)?.name !== 'AbortError') errors.push(`${label}: ${describeError(r.reason)}`);
  }
  const local = (opts.local ?? []).filter((f) => relevance(f, q) > 0);
  const ranked = dedupe(remote)
    .map((f, i) => ({ f, s: relevance(f, q), i }))
    .sort((a, b) => b.s - a.s || a.i - b.i)
    .map((x) => x.f);
  return { foods: dedupe([...local, ...ranked]), errors };
}

export async function lookupBarcode(
  barcode: string,
  opts: { usdaApiKey?: string; signal?: AbortSignal; fetchImpl?: typeof fetch } = {},
): Promise<Food | null> {
  try {
    const off = await lookupOpenFoodFactsBarcode(barcode, opts);
    if (off) return off;
  } catch {
    // fall through to USDA
  }
  return lookupUsdaBarcode(barcode, { ...opts, apiKey: opts.usdaApiKey });
}

export { searchOpenFoodFacts, searchUsda };

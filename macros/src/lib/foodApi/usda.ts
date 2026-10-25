import type { Food, Nutrients, Serving } from '../types';

/**
 * USDA FoodData Central: free, lab-quality data for generic foods
 * (Foundation, SR Legacy, FNDDS) plus a large branded set. Needs an api.data.gov
 * key; DEMO_KEY works but is heavily rate limited.
 * https://fdc.nal.usda.gov/api-guide
 */

const BASE = 'https://api.nal.usda.gov/fdc/v1';
export const DEMO_KEY = 'DEMO_KEY';

// Nutrient ids. Energy has several ids depending on dataset.
const ENERGY_KCAL = [1008, 2047, 2048];
const PROTEIN = 1003;
const FAT = 1004;
const CARBS = 1005;
const FIBER = 1079;
const SUGAR = [2000, 1063];
const SODIUM = 1093;

export interface UsdaNutrient {
  nutrientId?: number;
  nutrientNumber?: string;
  unitName?: string;
  value?: number;
}

export interface UsdaFood {
  fdcId: number;
  description: string;
  dataType?: string;
  brandOwner?: string;
  brandName?: string;
  gtinUpc?: string;
  servingSize?: number;
  servingSizeUnit?: string;
  householdServingFullText?: string;
  foodNutrients?: UsdaNutrient[];
  foodMeasures?: { disseminationText?: string; gramWeight?: number }[];
}

function pick(list: UsdaNutrient[], ids: number | number[]): number | undefined {
  const wanted = Array.isArray(ids) ? ids : [ids];
  for (const id of wanted) {
    const hit = list.find((n) => n.nutrientId === id && (n.unitName ?? '').toUpperCase() !== 'KJ');
    if (hit?.value != null) return hit.value;
  }
  return undefined;
}

export function parseUsdaNutrients(list: UsdaNutrient[] | undefined): Nutrients | null {
  if (!list?.length) return null;
  let calories = pick(list, ENERGY_KCAL);
  const protein = pick(list, PROTEIN) ?? 0;
  const fat = pick(list, FAT) ?? 0;
  const carbs = pick(list, CARBS) ?? 0;
  if (calories == null) {
    const kj = list.find((n) => n.nutrientId === 1062 || (n.unitName ?? '').toUpperCase() === 'KJ');
    if (kj?.value != null) calories = kj.value / 4.184;
  }
  if (calories == null) return null;
  const out: Nutrients = { calories, protein, carbs, fat };
  const fiber = pick(list, FIBER);
  const sugar = pick(list, SUGAR);
  const sodium = pick(list, SODIUM);
  if (fiber != null) out.fiber = fiber;
  if (sugar != null) out.sugar = sugar;
  if (sodium != null) out.sodium = sodium;
  return out;
}

function titleCase(s: string): string {
  // Branded descriptions come in ALL CAPS.
  if (s !== s.toUpperCase()) return s;
  return s.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
}

export function parseUsdaFood(f: UsdaFood): Food | null {
  const nutrients = parseUsdaNutrients(f.foodNutrients);
  if (!nutrients || !f.description) return null;

  const unitRaw = (f.servingSizeUnit ?? 'g').toLowerCase();
  const unit: 'g' | 'ml' = unitRaw === 'ml' || unitRaw === 'mlt' ? 'ml' : 'g';
  const servings: Serving[] = [];
  if (f.servingSize && f.servingSize > 0) {
    const household = f.householdServingFullText?.trim();
    const size = `${Math.round(f.servingSize * 10) / 10} ${unit}`;
    servings.push({ label: household ? `${household} (${size})` : `1 serving (${size})`, amount: f.servingSize });
  }
  for (const m of f.foodMeasures ?? []) {
    if (m.gramWeight && m.gramWeight > 0 && m.disseminationText && !/quantity not specified/i.test(m.disseminationText)) {
      servings.push({ label: `${m.disseminationText} (${Math.round(m.gramWeight)} g)`, amount: m.gramWeight });
    }
  }
  servings.push({ label: unit, amount: 1 });

  const brand = f.brandName || f.brandOwner;
  return {
    id: `usda:${f.fdcId}`,
    source: 'usda',
    name: titleCase(f.description),
    brand: brand ? titleCase(brand) : undefined,
    barcode: f.gtinUpc || undefined,
    // Search results report nutrients per 100 g/ml for every data type.
    base: { unit, amount: 100 },
    nutrients,
    servings: dedupeServings(servings).slice(0, 8),
  };
}

function dedupeServings(list: Serving[]): Serving[] {
  const seen = new Set<string>();
  return list.filter((s) => (seen.has(s.label) ? false : (seen.add(s.label), true)));
}

export async function searchUsda(
  query: string,
  opts: {
    apiKey?: string;
    pageSize?: number;
    dataTypes?: string[];
    signal?: AbortSignal;
    fetchImpl?: typeof fetch;
  } = {},
): Promise<Food[]> {
  const f = opts.fetchImpl ?? fetch;
  const params = new URLSearchParams({
    api_key: opts.apiKey || DEMO_KEY,
    query,
    pageSize: String(opts.pageSize ?? 30),
  });
  const types = opts.dataTypes ?? ['Foundation', 'SR Legacy', 'Survey (FNDDS)', 'Branded'];
  for (const t of types) params.append('dataType', t);
  const res = await f(`${BASE}/foods/search?${params}`, { signal: opts.signal });
  if (res.status === 429) throw new Error('USDA rate limit hit. Add your own free API key in Settings.');
  if (!res.ok) throw new Error(`USDA search failed (${res.status})`);
  const body = (await res.json()) as { foods?: UsdaFood[] };
  return (body.foods ?? []).map(parseUsdaFood).filter((x): x is Food => x != null);
}

export async function lookupUsdaBarcode(
  barcode: string,
  opts: { apiKey?: string; signal?: AbortSignal; fetchImpl?: typeof fetch } = {},
): Promise<Food | null> {
  const results = await searchUsda(barcode, { ...opts, dataTypes: ['Branded'], pageSize: 5 });
  const digits = barcode.replace(/^0+/, '');
  return results.find((r) => r.barcode?.replace(/^0+/, '') === digits) ?? null;
}

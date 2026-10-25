import { Platform } from 'react-native';

import type { Food, Nutrients, Serving } from '../types';

/**
 * Open Food Facts: the largest free, open food database (millions of branded
 * products, barcode-indexed). No API key. Nutrition is reported per 100 g/ml.
 * https://openfoodfacts.github.io/openfoodfacts-server/api/
 */

const BASE = 'https://world.openfoodfacts.org';
const FIELDS = [
  'code',
  'product_name',
  'product_name_en',
  'brands',
  'nutriments',
  'serving_size',
  'serving_quantity',
  'quantity',
  'product_quantity',
].join(',');

// OFF asks clients to identify themselves. Browsers forbid setting User-Agent.
const HEADERS: Record<string, string> = Platform.OS === 'web' ? {} : { 'User-Agent': 'MacrosPersonalApp/1.0 (personal use)' };

export interface OffProduct {
  code?: string;
  product_name?: string;
  product_name_en?: string;
  brands?: string;
  nutriments?: Record<string, number | string | undefined>;
  serving_size?: string;
  serving_quantity?: number | string;
  quantity?: string;
  product_quantity?: number | string;
}

function num(v: unknown): number | undefined {
  const n = typeof v === 'string' ? parseFloat(v) : typeof v === 'number' ? v : NaN;
  return Number.isFinite(n) ? n : undefined;
}

export function parseOffNutrients(n: OffProduct['nutriments']): Nutrients | null {
  if (!n) return null;
  let calories = num(n['energy-kcal_100g']);
  if (calories == null) {
    const kj = num(n['energy-kj_100g']) ?? num(n['energy_100g']);
    if (kj != null) calories = kj / 4.184;
  }
  const protein = num(n['proteins_100g']);
  const carbs = num(n['carbohydrates_100g']);
  const fat = num(n['fat_100g']);
  if (calories == null || protein == null || carbs == null || fat == null) return null;
  const out: Nutrients = { calories, protein, carbs, fat };
  const fiber = num(n['fiber_100g']);
  const sugar = num(n['sugars_100g']);
  const sodiumG = num(n['sodium_100g']);
  if (fiber != null) out.fiber = fiber;
  if (sugar != null) out.sugar = sugar;
  if (sodiumG != null) out.sodium = sodiumG * 1000;
  return out;
}

export function parseOffProduct(p: OffProduct): Food | null {
  const name = (p.product_name || p.product_name_en || '').trim();
  const nutrients = parseOffNutrients(p.nutriments);
  if (!name || !nutrients || !p.code) return null;

  const isLiquid = /\bml\b|\bl\b|cl\b/i.test(p.serving_size ?? p.quantity ?? '');
  const unit = isLiquid ? 'ml' : 'g';
  const servings: Serving[] = [];
  const servingQty = num(p.serving_quantity);
  if (servingQty && servingQty > 0) {
    servings.push({ label: p.serving_size?.trim() || `1 serving (${servingQty} ${unit})`, amount: servingQty });
  }
  const packageQty = num(p.product_quantity);
  if (packageQty && packageQty > 0 && packageQty !== servingQty) {
    servings.push({ label: `1 package (${packageQty} ${unit})`, amount: packageQty });
  }
  servings.push({ label: unit, amount: 1 });

  return {
    id: `off:${p.code}`,
    source: 'off',
    name,
    brand: p.brands?.split(',')[0]?.trim() || undefined,
    barcode: p.code,
    base: { unit, amount: 100 },
    nutrients,
    servings,
  };
}

export async function searchOpenFoodFacts(
  query: string,
  opts: { pageSize?: number; signal?: AbortSignal; fetchImpl?: typeof fetch } = {},
): Promise<Food[]> {
  const f = opts.fetchImpl ?? fetch;
  const params = new URLSearchParams({
    search_terms: query,
    search_simple: '1',
    action: 'process',
    json: '1',
    page_size: String(opts.pageSize ?? 30),
    fields: FIELDS,
  });
  const res = await f(`${BASE}/cgi/search.pl?${params}`, { headers: HEADERS, signal: opts.signal });
  if (!res.ok) throw new Error(`Open Food Facts search failed (${res.status})`);
  const body = (await res.json()) as { products?: OffProduct[] };
  return (body.products ?? []).map(parseOffProduct).filter((x): x is Food => x != null);
}

export async function lookupOpenFoodFactsBarcode(
  barcode: string,
  opts: { signal?: AbortSignal; fetchImpl?: typeof fetch } = {},
): Promise<Food | null> {
  const f = opts.fetchImpl ?? fetch;
  const res = await f(`${BASE}/api/v2/product/${encodeURIComponent(barcode)}.json?fields=${FIELDS}`, {
    headers: HEADERS,
    signal: opts.signal,
  });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`Open Food Facts lookup failed (${res.status})`);
  const body = (await res.json()) as { status?: number; product?: OffProduct };
  if (!body.product || body.status === 0) return null;
  return parseOffProduct({ ...body.product, code: body.product.code ?? barcode });
}

import { lookupBarcode, relevance, searchFoods } from '@/lib/foodApi';
import { parseOffProduct } from '@/lib/foodApi/openFoodFacts';
import { parseUsdaFood } from '@/lib/foodApi/usda';

// Response shapes follow the published API docs. These verify parsing and merging;
// they do not prove the live endpoints are reachable.
const offProduct = {
  code: '0049000028911',
  product_name: 'Coca-Cola Classic',
  brands: 'Coca-Cola, The Coca-Cola Company',
  serving_size: '355 ml',
  serving_quantity: 355,
  product_quantity: 355,
  nutriments: {
    'energy-kcal_100g': 42,
    proteins_100g: 0,
    carbohydrates_100g: 10.6,
    sugars_100g: 10.6,
    fat_100g: 0,
    sodium_100g: 0.0127,
  },
};

const usdaChicken = {
  fdcId: 171477,
  description: 'Chicken, broilers or fryers, breast, meat only, cooked, roasted',
  dataType: 'SR Legacy',
  foodNutrients: [
    { nutrientId: 1003, unitName: 'G', value: 31 },
    { nutrientId: 1004, unitName: 'G', value: 3.57 },
    { nutrientId: 1005, unitName: 'G', value: 0 },
    { nutrientId: 1008, unitName: 'KCAL', value: 165 },
    { nutrientId: 1093, unitName: 'MG', value: 74 },
  ],
  foodMeasures: [
    { disseminationText: '1 cup, chopped or diced', gramWeight: 140 },
    { disseminationText: 'Quantity not specified', gramWeight: 120 },
  ],
};

const usdaBranded = {
  fdcId: 2000000,
  description: 'GREEK YOGURT NONFAT PLAIN',
  dataType: 'Branded',
  brandOwner: 'FAGE USA DAIRY INDUSTRY INC',
  gtinUpc: '689544080015',
  servingSize: 170,
  servingSizeUnit: 'g',
  householdServingFullText: '1 container',
  foodNutrients: [
    { nutrientId: 1003, unitName: 'G', value: 10.6 },
    { nutrientId: 1004, unitName: 'G', value: 0 },
    { nutrientId: 1005, unitName: 'G', value: 3.53 },
    { nutrientId: 1008, unitName: 'KCAL', value: 53 },
  ],
};

function fakeFetch(routes: Record<string, unknown>, status = 200): typeof fetch {
  return (async (url: string) => {
    const key = Object.keys(routes).find((k) => url.includes(k));
    if (!key) return { ok: false, status: 404, json: async () => ({}) };
    return { ok: status < 400, status, json: async () => routes[key] };
  }) as unknown as typeof fetch;
}

describe('Open Food Facts parsing', () => {
  test('per-100ml product with serving and package sizes', () => {
    const f = parseOffProduct(offProduct)!;
    expect(f.id).toBe('off:0049000028911');
    expect(f.brand).toBe('Coca-Cola');
    expect(f.base).toEqual({ unit: 'ml', amount: 100 });
    expect(f.servings[0]).toEqual({ label: '355 ml', amount: 355 });
    expect(f.servings.at(-1)).toEqual({ label: 'ml', amount: 1 });
    expect(f.nutrients.sodium).toBeCloseTo(12.7);
  });

  test('falls back to kJ and rejects incomplete products', () => {
    const kj = parseOffProduct({
      code: '1',
      product_name: 'Bar',
      nutriments: { energy_100g: 1674, proteins_100g: 20, carbohydrates_100g: 40, fat_100g: 15 },
    })!;
    expect(kj.nutrients.calories).toBeCloseTo(400, 0);
    expect(parseOffProduct({ code: '2', product_name: 'No macros', nutriments: {} })).toBeNull();
    expect(parseOffProduct({ code: '3', nutriments: offProduct.nutriments })).toBeNull();
  });
});

describe('USDA parsing', () => {
  test('generic food with household measures', () => {
    const f = parseUsdaFood(usdaChicken)!;
    expect(f.name).toMatch(/^Chicken, broilers/);
    expect(f.nutrients).toMatchObject({ calories: 165, protein: 31, fat: 3.57, carbs: 0, sodium: 74 });
    expect(f.servings.map((s) => s.label)).toEqual(['1 cup, chopped or diced (140 g)', 'g']);
  });

  test('branded food: title case, serving, barcode', () => {
    const f = parseUsdaFood(usdaBranded)!;
    expect(f.name).toBe('Greek Yogurt Nonfat Plain');
    expect(f.brand).toBe('Fage Usa Dairy Industry Inc');
    expect(f.barcode).toBe('689544080015');
    expect(f.servings[0]).toEqual({ label: '1 container (170 g)', amount: 170 });
  });

  test('uses Atwater energy when 1008 is missing', () => {
    const f = parseUsdaFood({
      fdcId: 1,
      description: 'Apple',
      foodNutrients: [
        { nutrientId: 2047, unitName: 'KCAL', value: 64 },
        { nutrientId: 1005, unitName: 'G', value: 15 },
      ],
    })!;
    expect(f.nutrients.calories).toBe(64);
  });
});

describe('combined search', () => {
  test('merges both sources, ranks generic matches first, survives one source failing', async () => {
    const fetchImpl = fakeFetch({
      'api.nal.usda.gov': { foods: [usdaChicken] },
      'openfoodfacts.org/cgi/search.pl': { products: [{ ...offProduct, product_name: 'Chicken flavored crackers' }] },
    });
    const r = await searchFoods('chicken breast', { fetchImpl });
    expect(r.errors).toEqual([]);
    expect(r.foods.map((f) => f.source)).toEqual(['usda', 'off']);

    const failing = (async (url: string) =>
      url.includes('nal.usda')
        ? { ok: false, status: 429, json: async () => ({}) }
        : { ok: true, status: 200, json: async () => ({ products: [offProduct] }) }) as unknown as typeof fetch;
    const r2 = await searchFoods('coca cola', { fetchImpl: failing });
    expect(r2.foods).toHaveLength(1);
    expect(r2.errors[0]).toMatch(/rate limit/);
    expect(r2.errors[0]).toMatch(/^USDA: /);

    const offline = (async () => {
      throw new TypeError('Failed to fetch');
    }) as unknown as typeof fetch;
    const r3 = await searchFoods('oats', { fetchImpl: offline });
    expect(r3.errors).toEqual(["USDA: couldn't connect", "Open Food Facts: couldn't connect"]);
  });

  test('relevance prefers names containing the query', () => {
    const a = parseUsdaFood(usdaChicken)!;
    const b = parseOffProduct(offProduct)!;
    expect(relevance(a, 'chicken')).toBeGreaterThan(relevance(b, 'chicken'));
  });

  test('barcode lookup falls back to USDA when OFF has no match', async () => {
    const fetchImpl = fakeFetch({ 'api.nal.usda.gov': { foods: [usdaBranded] } });
    const f = await lookupBarcode('0689544080015', { fetchImpl });
    expect(f?.id).toBe('usda:2000000');
  });
});

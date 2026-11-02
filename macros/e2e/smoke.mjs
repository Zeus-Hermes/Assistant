// End-to-end smoke test against the exported web build (`npm run export:web`).
// Drives the real screens in headless Chromium at phone size.
//
// Food database calls are answered from recorded fixtures (see FIXTURES) so the
// flow is deterministic; pass LIVE=1 to let them hit the real APIs instead.
//
// Usage: node e2e/smoke.mjs [screenshotDir]
import { mkdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { createRequire } from 'node:module';

import { serveDist } from './serve.mjs';

// Resolved via require so a globally installed Playwright works too.
const { chromium } = createRequire(import.meta.url)('playwright');

const DIST = resolve(import.meta.dirname, '..', 'dist');
const SHOTS = resolve(process.argv[2] ?? join(import.meta.dirname, 'screenshots'));
const LIVE = process.env.LIVE === '1';
mkdirSync(SHOTS, { recursive: true });

const { server, base } = await serveDist(DIST);

const FIXTURES = {
  usda: {
    foods: [
      {
        fdcId: 171477,
        description: 'Chicken, broilers or fryers, breast, meat only, cooked, roasted',
        dataType: 'SR Legacy',
        foodNutrients: [
          { nutrientId: 1003, unitName: 'G', value: 31 },
          { nutrientId: 1004, unitName: 'G', value: 3.57 },
          { nutrientId: 1005, unitName: 'G', value: 0 },
          { nutrientId: 1008, unitName: 'KCAL', value: 165 },
        ],
        foodMeasures: [{ disseminationText: '1 cup, chopped or diced', gramWeight: 140 }],
      },
    ],
  },
  off: {
    products: [
      {
        code: '0049000028911',
        product_name: 'Chicken Noodle Soup',
        brands: 'Campbell',
        serving_size: '245 g',
        serving_quantity: 245,
        nutriments: { 'energy-kcal_100g': 25, proteins_100g: 1.2, carbohydrates_100g: 3.3, fat_100g: 0.8 },
      },
    ],
  },
};

const results = [];
let failures = 0;
async function step(name, fn) {
  try {
    await fn();
    results.push(`PASS  ${name}`);
  } catch (e) {
    failures++;
    results.push(`FAIL  ${name}\n      ${String(e.message).split('\n')[0]}`);
    await page.screenshot({ path: join(SHOTS, `FAIL-${name.replace(/\W+/g, '-')}.png`) }).catch(() => {});
  }
}

const browser = await chromium.launch();
const context = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
const page = await context.newPage();
const consoleErrors = [];
page.on('pageerror', (e) => consoleErrors.push(e.message));
page.on('console', (m) => m.type() === 'error' && consoleErrors.push(m.text()));
page.on('dialog', (d) => d.accept());

if (!LIVE) {
  await page.route('**/api.nal.usda.gov/**', (r) => r.fulfill({ json: FIXTURES.usda }));
  await page.route('**/world.openfoodfacts.org/cgi/search.pl**', (r) => r.fulfill({ json: FIXTURES.off }));
  await page.route('**/world.openfoodfacts.org/api/v2/product/**', (r) =>
    r.fulfill({ json: { status: 1, product: FIXTURES.off.products[0] } }),
  );
}

// Web stacks keep covered screens in the DOM, so only match what is on screen.
const byId = (id) => page.getByTestId(id).filter({ visible: true });
const text = (t, opts) => page.getByText(t, opts).filter({ visible: true });
const shot = (name) => page.screenshot({ path: join(SHOTS, `${name}.png`) });

await page.goto(base);

await step('app opens on the dashboard with plan setup in place', async () => {
  await byId('setup-card').waitFor({ timeout: 20000 });
  await byId('nutrition-card').waitFor();
  await byId('ob-birth-year').fill('1996');
  await byId('ob-feet').fill('5');
  await byId('ob-inches').fill('11');
  await byId('ob-weight').fill('185');
  await byId('ob-preview').waitFor();
  const preview = await byId('ob-preview').innerText();
  if (!/kcal/.test(preview)) throw new Error(`preview missing calories: ${preview}`);
  await shot('01-setup');
  await byId('ob-finish').click();
  await byId('setup-card').waitFor({ state: 'detached' });
});

await step('dashboard shows targets once setup is done', async () => {
  await byId('calorie-ring').waitFor();
  await byId('expenditure-card').waitFor();
  await byId('weight-card').waitFor();
  await shot('02-dashboard-empty');
});

/** Total kcal logged at an hour on the timeline, read from its entries. */
async function hourText(h) {
  return byId(`hour-${h}`).innerText();
}

await step('quick add goes through the cart and lands at the chosen hour', async () => {
  await byId('tab-log').click();
  await byId('add-12').click();
  await byId('tab-quick').click();
  await byId('qa-name').fill('Protein shake');
  await byId('qa-protein').fill('40');
  await byId('qa-carbs').fill('10');
  await byId('qa-fat').fill('3');
  await text('Calories will be calculated from macros: 227 kcal.').waitFor();
  await shot('03-quick-add');
  await byId('qa-save').click();
  await byId('cart-pill').getByText('1').waitFor();
  await byId('log-foods').click();
  await byId('hour-12').getByText('Protein shake').waitFor();
  if (!/227/.test(await hourText(12))) throw new Error(await hourText(12));
});

await step('search merges both databases; serving picker and + both add to the cart', async () => {
  await byId('add-13').click();
  await byId('food-search').fill('chicken breast');
  await byId('result-0').waitFor({ timeout: 15000 });
  await shot('04-search');
  const first = await byId('result-0').innerText();
  if (!/Chicken, broilers/.test(first)) throw new Error(`unexpected first result: ${first}`);
  await byId('result-0').click();
  await byId('food-name').waitFor();
  await text('1 cup, chopped or diced (140 g)').click();
  await byId('qty-input').fill('1.5');
  // 165 kcal/100 g × 140 g × 1.5 = 346.5
  await page.waitForFunction(() => [...document.querySelectorAll('[data-testid="detail-kcal"]')].some((e) => e.textContent === '347'));
  await shot('05-food-detail');
  await byId('save-food').click();
  await byId('result-1-add').click();
  await byId('cart-pill').getByText('2').waitFor();
  // Logged 227 earlier + 347 chicken + 61 soup (245 g × 25 kcal/100 g) in the cart.
  await byId('cart-kcal').getByText('635', { exact: false }).waitFor();
  await byId('log-foods').click();
  await byId('hour-13').getByText('Chicken, broilers', { exact: false }).waitFor();
  await byId('hour-13').getByText('Chicken Noodle Soup').waitFor();
});

await step('editing an entry recomputes it', async () => {
  await byId('hour-13').getByText('Chicken, broilers', { exact: false }).click();
  await byId('qty-input').fill('1');
  await byId('save-food').click();
  await byId('hour-13').getByText('231', { exact: false }).waitFor();
  await shot('06-food-log');
});

await step('custom food is created from Library and logged', async () => {
  await byId('add-18').click();
  await byId('tab-library').click();
  await byId('tool-create').click();
  await byId('cf-name').fill('Homemade chili');
  await byId('cf-kcal').fill('420');
  await byId('cf-protein').fill('32');
  await byId('cf-save').click();
  await byId('save-food').click();
  await byId('log-foods').click();
  await byId('hour-18').getByText('Homemade chili').waitFor();
  if (!/420/.test(await hourText(18))) throw new Error(await hourText(18));
});

await step('recent picks remember the last portion', async () => {
  await byId('add-19').click();
  const picks = await byId('result-0').innerText();
  if (!/Homemade chili/.test(picks)) throw new Error(`most recent pick should be the chili: ${picks}`);
  // Chicken was logged as 1.5 cups (later edits change the entry, not the remembered portion).
  await text('1.5 × 1 cup, chopped or diced (140 g)', { exact: false }).waitFor();
  await byId('sheet-close').click();
});

await step('barcode typed into the Scan tab opens the product', async () => {
  await byId('add-8').click();
  await byId('tab-scan').click();
  await byId('barcode-input').fill('0049000028911');
  await byId('barcode-lookup').click();
  await byId('food-name').waitFor();
  const name = await byId('food-name').innerText();
  if (name !== 'Chicken Noodle Soup') throw new Error(name);
  await page.goBack();
  await byId('sheet-close').click();
});

await step('shortcuts sheet logs a weigh-in', async () => {
  await byId('tab-plus').click();
  await byId('shortcuts').waitFor();
  await shot('07-shortcuts');
  await byId('sc-weight').click();
  await byId('weight-input').fill('184.2');
  await byId('weight-save').click();
  await byId('tab-index').click();
  await byId('weight-card').getByText('184.2').waitFor();
});

await step('strategy shows the check-in ring and program', async () => {
  await byId('tab-strategy').click();
  await byId('checkin-ring').waitFor();
  await byId('program-card').waitFor();
  await shot('08-strategy');
});

await step('more → data shows what is stored', async () => {
  await byId('tab-more').click();
  await byId('more-data').click();
  await text('4 log entries', { exact: false }).waitFor();
  await shot('09-data');
});

await step('data survives a reload', async () => {
  await page.goto(`${base}/log`);
  await byId('hour-12').getByText('Protein shake').waitFor();
});

await step('dashboard reflects the logged day', async () => {
  await page.goto(base);
  await byId('nutrition-card').getByText('of', { exact: false }).waitFor();
  const body = await byId('nutrition-card').innerText();
  // 227 + 231 + 61 + 420 = 939
  if (!/939 of/.test(body)) throw new Error(body);
  await shot('10-dashboard-logged');
});

await browser.close();
server.close();

const relevantErrors = consoleErrors.filter((e) => !/Failed to load resource/.test(e));
console.log(results.join('\n'));
if (relevantErrors.length) console.log(`\nConsole errors:\n  ${relevantErrors.slice(0, 10).join('\n  ')}`);
console.log(
  `\n${results.length - failures}/${results.length} passed · screenshots in ${SHOTS}${LIVE ? ' · LIVE APIs' : ' · fixture APIs'}`,
);
process.exit(failures || relevantErrors.length ? 1 : 0);

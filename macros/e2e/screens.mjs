// Seeds a realistic day plus six weeks of history and screenshots every main
// screen at phone size, for comparing against MacroFactor by eye.
//
// Usage: node e2e/screens.mjs [screenshotDir]
import { mkdirSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join, resolve } from 'node:path';

import { serveDist } from './serve.mjs';

const { chromium } = createRequire(import.meta.url)('playwright');

const SHOTS = resolve(process.argv[2] ?? join(import.meta.dirname, 'screenshots'));
mkdirSync(SHOTS, { recursive: true });
const { server, base } = await serveDist(resolve(import.meta.dirname, '..', 'dist'));

const key = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const food = (id, name, brand, per100, servings) => ({
  id,
  source: 'usda',
  name,
  brand,
  base: { unit: 'g', amount: 100 },
  nutrients: per100,
  servings: [...servings, { label: 'g', amount: 1 }],
});
const rice = food('usda:1', 'White Rice, Cooked In Unsalted Water', undefined, { calories: 130, protein: 2.7, carbs: 28, fat: 0.3 }, []);
const beans = food('usda:2', 'Organic Black Beans', 'Great Value', { calories: 85, protein: 5, carbs: 15, fat: 0.5 }, []);
const chicken = food('usda:3', 'Chargrilled Chipotle Seasoned Chicken', 'Costco', { calories: 100, protein: 16, carbs: 3, fat: 2.4 }, [
  { label: 'portion (85 g)', amount: 85 },
]);
const cheese = food(
  'usda:4',
  'Mozzarella Shredded Fat Free Mozzarella Cheese',
  'Kraft',
  { calories: 160, protein: 32, carbs: 8, fat: 0 },
  [],
);

const today = key(new Date());
let seed = 3;
const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647) * 2 - 1;
const entries = [];
const weighIns = [];
let kg = 86;
for (let i = 41; i >= 1; i--) {
  const d = new Date();
  d.setDate(d.getDate() - i);
  const date = key(d);
  weighIns.push({ date, kg: Math.round((kg + rand() * 0.5) * 10) / 10 });
  const eaten = 2150 + rand() * 250;
  entries.push({
    id: `h${i}`,
    date,
    hour: 13,
    name: 'Seeded day',
    nutrients: { calories: eaten, protein: 160, carbs: 210, fat: 70 },
    createdAt: i,
  });
  kg += (eaten - 2700) / 7700;
}
weighIns.push({ date: today, kg: Math.round(kg * 10) / 10 });
const log = (id, hour, f, label, amount, quantity) => {
  const factor = (amount * quantity) / 100;
  const n = Object.fromEntries(Object.entries(f.nutrients).map(([k, v]) => [k, v * factor]));
  entries.push({
    id,
    date: today,
    hour,
    name: f.name,
    food: f,
    serving: { label, amount },
    quantity,
    nutrients: n,
    createdAt: Date.now() + hour,
  });
};
log('t1', 8, rice, 'g', 1, 150);
log('t2', 12, chicken, 'portion (85 g)', 85, 2);
log('t3', 12, beans, 'g', 1, 100);
log('t4', 12, cheese, 'g', 1, 25);

const state = {
  profile: { sex: 'male', birthYear: 1996, heightCm: 180, activity: 1.3, units: 'imperial' },
  goal: { type: 'lose', rateKgPerWeek: 0.45, proteinPerKg: 2, fatShare: 0.27 },
  entries,
  weighIns,
  customFoods: [],
  recentFoods: [rice, beans, chicken, cheese],
  usdaApiKey: '',
};

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
await page.addInitScript((s) => localStorage.setItem('macros-store', JSON.stringify({ state: s, version: 2 })), state);

const shot = async (name) => {
  await page.waitForTimeout(400);
  await page.screenshot({ path: join(SHOTS, `${name}.png`) });
};
const vis = (id) => page.getByTestId(id).filter({ visible: true });

await page.goto(base);
await vis('nutrition-card').waitFor();
await shot('mf-dashboard');
await vis('tab-log').click();
await vis('timeline').waitFor();
await shot('mf-food-log');
await vis('tab-strategy').click();
await vis('checkin-ring').waitFor();
await shot('mf-strategy');
await vis('tab-more').click();
await vis('more-goal').waitFor();
await shot('mf-more');
await vis('tab-plus').click();
await vis('shortcuts').waitFor();
await shot('mf-shortcuts');
await vis('sc-search').click();
await vis('food-search').waitFor();
await shot('mf-add-food');
await browser.close();
server.close();

if (errors.length) {
  console.log(`Page errors:\n  ${errors.join('\n  ')}`);
  process.exit(1);
}
console.log(`Screenshots in ${SHOTS}`);

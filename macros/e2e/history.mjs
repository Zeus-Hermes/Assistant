// Seeds six weeks of simulated history and screenshots the dashboard and
// progress screens, to check the charts and adaptive expenditure visually.
//
// Simulated person: true expenditure 2,700 kcal/day, eating ~2,150 with
// day-to-day noise, scale weight with ±0.6 kg water noise, a few unlogged days.
//
// Usage: node e2e/history.mjs [screenshotDir]
import { mkdirSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join, resolve } from 'node:path';

import { serveDist } from './serve.mjs';

const { chromium } = createRequire(import.meta.url)('playwright');

const SHOTS = resolve(process.argv[2] ?? join(import.meta.dirname, 'screenshots'));
mkdirSync(SHOTS, { recursive: true });
const { server, base } = await serveDist(resolve(import.meta.dirname, '..', 'dist'));

const TRUE_TDEE = 2700;
const DAYS = 42;
let seed = 7;
const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647) * 2 - 1;
const key = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

const entries = [];
const weighIns = [];
let kg = 86;
const start = new Date();
start.setDate(start.getDate() - DAYS + 1);
for (let i = 0; i < DAYS; i++) {
  const d = new Date(start);
  d.setDate(start.getDate() + i);
  const date = key(d);
  weighIns.push({ date, kg: Math.round((kg + rand() * 0.6) * 10) / 10 });
  const eaten = 2150 + rand() * 250;
  if (i % 9 !== 4) {
    entries.push({
      id: `seed-${i}`,
      date,
      meal: 'lunch',
      name: 'Seeded day',
      nutrients: { calories: eaten, protein: 170, carbs: 200, fat: 70 },
      createdAt: i,
    });
  }
  kg += (eaten - TRUE_TDEE) / 7700;
}

const state = {
  profile: { sex: 'male', birthYear: 1996, heightCm: 180, activity: 1.3, units: 'imperial' },
  goal: { type: 'lose', rateKgPerWeek: 0.45, proteinPerKg: 2, fatShare: 0.27 },
  entries,
  weighIns,
  customFoods: [],
  recentFoods: [],
  usdaApiKey: '',
};

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
await page.addInitScript((s) => localStorage.setItem('macros-store', JSON.stringify({ state: s, version: 1 })), state);
await page.goto(base);
await page.getByTestId('expenditure-card').waitFor();
const exp = await page.getByTestId('expenditure-card').innerText();
await page.screenshot({ path: join(SHOTS, 'history-dashboard.png'), fullPage: true });
await page.goto(`${base}/progress`);
await page.getByTestId('weight-chart').waitFor();
await page.waitForTimeout(300);
await page.screenshot({ path: join(SHOTS, 'history-progress.png'), fullPage: true });
await browser.close();
server.close();

const estimate = Number(exp.match(/(\d{3,4})\s*kcal/)?.[1]);
console.log(`Estimated expenditure after ${DAYS} days: ${estimate} kcal (true ${TRUE_TDEE}, starting formula ~2,300)`);
process.exit(Math.abs(estimate - TRUE_TDEE) < 250 ? 0 : 1);

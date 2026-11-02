# Macros

A personal macro tracker modelled on MacroFactor: food logging against daily calorie and macro targets, quick add, barcode scanning, weigh-ins with a smoothed weight trend, and an adaptive expenditure estimate that resets your targets every Monday.

Built with Expo (SDK 58) and React Native. All data stays on your phone; export a backup from Settings.

## Run it on your phone

1. Install **Expo Go** from the App Store or Play Store.
2. On your computer:
   ```bash
   cd macros
   npm install
   npx expo start
   ```
3. Scan the QR code with your phone's camera (iOS) or the Expo Go app (Android). Your phone and computer need to be on the same Wi-Fi, or run `npx expo start --tunnel`.

You can also try it in a browser with `npm run web`. The barcode camera only works on the phone; the browser version has a "type the barcode" box instead.

For a standalone app that doesn't need your computer running, build it with EAS (`npx eas-cli@latest build --profile preview`) and install the result.

## Food databases

Search queries two free databases at the same time and merges the results:

| Source | What it's good for | Key |
| --- | --- | --- |
| [Open Food Facts](https://world.openfoodfacts.org) | The largest free food database: millions of branded, barcoded products, worldwide | None |
| [USDA FoodData Central](https://fdc.nal.usda.gov) | Lab-measured generic foods ("chicken breast, roasted") plus US branded foods | Free; [sign up](https://fdc.nal.usda.gov/api-key-signup) |

Without a key the app uses USDA's shared `DEMO_KEY`, which allows only about 30 searches an hour. Paste your own key in **Settings → Food database**.

Barcodes are looked up in Open Food Facts first, then USDA's branded foods.

## How the numbers work

- **Starting targets:** Mifflin–St Jeor BMR × activity level, adjusted for your goal rate (7,700 kcal per kg). Protein is set per kg of body weight, fat as a share of calories, and carbs fill the rest.
- **Weight trend:** an exponential moving average of daily weigh-ins (gaps interpolated), so water swings don't move the line much.
- **Expenditure:** each day, average logged intake over the last 21 days minus the energy stored or lost, from a regression on your weigh-ins over the same window. The estimate moves 10% toward that value each day. Days with nothing logged are skipped, not counted as zero.
- **Weekly check-in:** targets are recalculated from the expenditure estimate every Monday and stay fixed for the week.

The core math is in `src/lib/nutrition.ts`, `src/lib/expenditure.ts` and `src/lib/plan.ts`.

## Project layout

The look follows MacroFactor's dark theme: Unbounded for the wide screen titles, Poppins for everything else, white pills and rings on near-black.

```
src/app/            screens (Expo Router)
  (tabs)/           Dashboard, Food Log (hourly timeline), Strategy, More
  add-food.tsx      the add sheet: Scan / Search / AI / Quick Add / Library tabs, cart, "Log Foods"
  shortcuts.tsx     sheet behind the centre + button
  food-detail.tsx   serving picker; adds to the cart or edits a logged entry
  quick-add.tsx     edit a quick-add entry
  custom-food.tsx   create a reusable food
  weigh-in.tsx
  insights/         weight trend and expenditure charts
  settings/         goal, profile, units, expenditure, food database, data & backup
  onboarding.tsx
src/components/     shared UI (tab bar, week strip, macro pager, rings, charts)
src/lib/            pure logic (math, food APIs, backup format)
src/store/          zustand stores: persisted data, the add-food cart, selected day
__tests__/          Jest unit tests
e2e/                Playwright tests against the web build
```

## Tests

```bash
npm test            # unit tests: math, adaptive expenditure, API parsing, store, backups
npm run typecheck
npm run test:e2e    # exports the web build, then clicks through it in headless Chromium
```

`e2e/smoke.mjs` answers food database requests with recorded sample responses, so it is deterministic. Run `LIVE=1 node e2e/smoke.mjs` to hit the real APIs. `e2e/history.mjs` seeds six weeks of simulated data (in the old meal-based format, to exercise the migration) and checks that the expenditure estimate converges on the true value. `e2e/screens.mjs` screenshots every main screen for side-by-side comparison.

## Roadmap

- **v2: voice logging.** Say "two eggs, a slice of toast with butter and a black coffee"; speech-to-text, then Claude turns it into food searches and portions you confirm before logging. This needs a small backend to hold the API key and a development build (speech recognition isn't in Expo Go).
- Sync between devices (e.g. Supabase) if on-device storage stops being enough.
- Micronutrients, recipes, and meal templates.

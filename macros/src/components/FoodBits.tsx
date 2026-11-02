import { Ionicons } from '@expo/vector-icons';
import { Text, View } from 'react-native';

import type { Nutrients } from '@/lib/types';
import { colors, fonts } from '@/theme';

// MacroFactor shows a small illustration per food; an emoji picked by keyword is the closest free stand-in.
const ICONS: [RegExp, string][] = [
  [/\brice\b/i, '🍚'],
  [/\bbeans?\b|lentil|chickpea/i, '🫘'],
  [/chicken|turkey/i, '🍗'],
  [/beef|steak|burger|meat/i, '🥩'],
  [/pork|bacon|ham\b/i, '🥓'],
  [/fish|salmon|tuna|cod|tilapia/i, '🐟'],
  [/shrimp|prawn/i, '🍤'],
  [/\begg/i, '🥚'],
  [/cheese|mozzarella|cheddar|parmesan/i, '🧀'],
  [/milk|yogurt|yoghurt|kefir/i, '🥛'],
  [/bread|toast|bagel|bun\b/i, '🍞'],
  [/pasta|spaghetti|noodle|macaroni/i, '🍝'],
  [/oat|cereal|granola/i, '🥣'],
  [/banana/i, '🍌'],
  [/apple/i, '🍎'],
  [/berr/i, '🫐'],
  [/orange|clementine/i, '🍊'],
  [/avocado/i, '🥑'],
  [/potato|fries/i, '🥔'],
  [/broccoli|spinach|lettuce|salad|kale|greens/i, '🥦'],
  [/carrot/i, '🥕'],
  [/tomato/i, '🍅'],
  [/nut|almond|peanut|cashew/i, '🥜'],
  [/chocolate|candy/i, '🍫'],
  [/cookie|biscuit/i, '🍪'],
  [/cake|muffin|donut/i, '🧁'],
  [/pizza/i, '🍕'],
  [/coffee|espresso|latte/i, '☕'],
  [/soda|cola|juice|drink|beverage/i, '🥤'],
  [/protein|shake|whey/i, '🥤'],
  [/soup|chili|stew/i, '🍲'],
  [/burrito|taco|wrap/i, '🌯'],
  [/sushi/i, '🍣'],
  [/butter|oil/i, '🧈'],
];

export function foodEmoji(name: string): string {
  return ICONS.find(([re]) => re.test(name))?.[1] ?? '🍽️';
}

export function FoodIcon({ name, size = 40 }: { name: string; size?: number }) {
  return (
    <View style={{ width: size, alignItems: 'center' }}>
      <Text style={{ fontSize: size * 0.8 }}>{foodEmoji(name)}</Text>
    </View>
  );
}

const r = (n: number) => Math.round(n);

/** "75🔥  2P  0F  16C  •  57.5 g", MacroFactor's one-line food summary. */
export function MacroLine({ n, amount, testID }: { n: Nutrients; amount?: string; testID?: string }) {
  return (
    <Text style={{ color: colors.textDim, fontFamily: fonts.regular, fontSize: 15 }} testID={testID}>
      {r(n.calories)}
      <Ionicons name="flame" size={14} color={colors.textDim} />
      {`  ${r(n.protein)}P  ${r(n.fat)}F  ${r(n.carbs)}C`}
      {amount ? `  •  ${amount}` : ''}
    </Text>
  );
}
